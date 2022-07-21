import * as statement from "cdk-iam-floyd";

import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Cluster, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { QueueProcessingFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { ManagedPolicy, Policy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { SqsDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Queue } from "aws-cdk-lib/aws-sqs";

import { InfrastructureAppStackProps } from "./props/infrastructure-app-stack-props";
import { ProfilingGroup } from "aws-cdk-lib/aws-codeguruprofiler";

export class InfrastructureAppStack extends Stack {
  constructor(scope: Construct, id: string, props: InfrastructureAppStackProps) {
    super(scope, id, props);

    const prefix = "raw/";
    const thumbnailPrefix = "thumbnails/";

    const region = Stack.of(this).region;

    // Amazon S3 Bucket for uploaded book covers.

    const bookCoversStorage = new Bucket(this, "BookCoversBucket", {
      bucketName: `bookworm-covers-${region}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    bookCoversStorage.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // REST API with AWS Lambda written in Python, that generates presigned upload links for the book covers.

    const uploadCoverAPI = new RestApi(this, "SharedAPI", {
      restApiName: "bookworm-api",
      description: "Shared Amazon API Gateway that handles book cover uploads.",

      deployOptions: {
        stageName: "prod"
      },

      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key"
        ],
        allowMethods: [ "OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE" ],
        allowCredentials: true,
        allowOrigins: [ "*" ]
      }
    });

    new CfnOutput(this, "URLForSharedAPI", {
      value: uploadCoverAPI.url
    });

    const uploadCoverAPIExecutionRole = new Role(this, "uploadCoverAPIImplementationExecutionRole", {
      roleName: "bookworm-upload-cover-presigned-link-generation-role",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com")
    });

    uploadCoverAPIExecutionRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    uploadCoverAPIExecutionRole.addToPolicy(
      new statement.S3()
        .allow()
        .onAllResources()
        .toListAllMyBuckets()
    );

    uploadCoverAPIExecutionRole.addToPolicy(
      new statement.S3()
        .allow()
        .on(bookCoversStorage.bucketArn)
        .toListBucket()
    );

    uploadCoverAPIExecutionRole.addToPolicy(
      new statement.S3()
        .allow()
        .on(`${bookCoversStorage.bucketArn}/${prefix}*`)
        .toGetObject()
        .toGetObjectAcl()
        .toPutObject()
        .toPutObjectAcl()
        .toDeleteObject()
    );

    const uploadCoverAPIImplementation = new Function(this, "uploadCoverAPIImplementation", {
      functionName: "bookworm-upload-cover-presigned-link-generation",

      role: uploadCoverAPIExecutionRole,

      runtime: Runtime.PYTHON_3_8,

      handler: "main.request_handler",
      code: Code.fromAsset("../services/bookworm-upload-cover/bookworm-upload-cover.zip"),

      memorySize: 512,

      profiling: true,

      timeout: Duration.seconds(25),
      logRetention: RetentionDays.FIVE_DAYS,

      environment: {
        COVERS_STORAGE_BUCKET_NAME: bookCoversStorage.bucketName,
        COVERS_STORAGE_PREFIX: prefix,
        PRESIGNED_LINK_VALIDNESS_DURATION_IN_S: Duration.minutes(5).toSeconds().toString()
      }
    });

    // Amazon API Gateway resource and method.

    const resource = uploadCoverAPI.root.addResource("upload-cover");
    resource.addMethod("POST", new LambdaIntegration(uploadCoverAPIImplementation, { proxy: true }));

    // Amazon SQS queue that catches all the uploaded raw covers for the thumbnail generation process (and its DLQ).

    const thumbnailGenerationDLQ = new Queue(this, "ThumbnailGenerationDLQ", {
      queueName: "bookworm-cover-thumbnail-generation-dlq",
      visibilityTimeout: Duration.seconds(120),
      retentionPeriod: Duration.days(14),
    });

    thumbnailGenerationDLQ.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const thumbnailGenerationQueue = new Queue(this, "ThumbnailGenerationQueue", {
      queueName: "bookworm-cover-thumbnail-generation-queue",
      visibilityTimeout: Duration.seconds(120),
      retentionPeriod: Duration.days(7),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: thumbnailGenerationDLQ
      }
    });

    thumbnailGenerationQueue.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Each object creation inside `raw/` prefix in the cover bucket lefts an event inside thumbnail generation queue.

    bookCoversStorage.addObjectCreatedNotification(new SqsDestination(thumbnailGenerationQueue), { prefix });

    // AWS Fargate cluster and task definition for a Java application that consumes event from the SQS queue
    // and generates thumbnails for a given cover.

    const cluster = new Cluster(this, "BookwormCluster", {
      clusterName: "bookworm-cluster"
    });

    cluster.enableFargateCapacityProviders();

    const thumbnailGeneratorService = new QueueProcessingFargateService(this, "BookwormThumbnailGenerator", {
      cluster,

      serviceName: "bookworm-thumbnail-generator-service",
      image: ContainerImage.fromEcrRepository(props.thumbnailGeneratorDockerImageRepository),

      cpu: 512,
      memoryLimitMiB: 1024,
      enableLogging: true,

      queue: thumbnailGenerationQueue,

      environment: {
        COVERS_STORAGE_BUCKET_NAME: bookCoversStorage.bucketName,
        COVERS_STORAGE_PREFIX: thumbnailPrefix
      },

      capacityProviderStrategies: [
        {
          capacityProvider: "FARGATE_SPOT",
          weight: 2,
        },
        {
          capacityProvider: "FARGATE",
          weight: 1,
        }
      ]
    });

    thumbnailGeneratorService.taskDefinition.taskRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonCodeGuruProfilerAgentAccess")
    );

    thumbnailGeneratorService.taskDefinition.taskRole.attachInlinePolicy(
      new Policy(this, "ThumbnailGeneratorServiceAdditionalIAMPolicy", {
        policyName: "bookworm-thumbnail-generator-service-s3-access-iam-policy",
        statements: [
          new statement.S3().allow().on(`${bookCoversStorage.bucketArn}/${prefix}*`).toGetObject(),
          new statement.S3().allow().on(`${bookCoversStorage.bucketArn}/${thumbnailPrefix}*`).toPutObject()
        ]
      })
    );

    new ProfilingGroup(this, "BookwormThumbnailGeneratorServiceProfilingGroup", {
      profilingGroupName: "BookwormThumbnailGeneratorService"
    });
  }
}
