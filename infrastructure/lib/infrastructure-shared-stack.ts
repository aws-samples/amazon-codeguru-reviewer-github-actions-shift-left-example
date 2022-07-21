import * as statement from "cdk-iam-floyd";

import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

import { Repository, TagStatus } from "aws-cdk-lib/aws-ecr";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";

import { InfrastructureSharedStackProps } from "./props/infrastructure-shared-stack-props";
import { CfnOIDCProvider, ManagedPolicy, Role, WebIdentityPrincipal } from "aws-cdk-lib/aws-iam";

export class InfrastructureSharedStack extends Stack {
  public readonly thumbnailGeneratorDockerImageRepository: Repository;

  constructor(scope: Construct, id: string, props: InfrastructureSharedStackProps) {

    super(scope, id, props);

    // Amazon ECR repository for Docker images.

    this.thumbnailGeneratorDockerImageRepository = new Repository(this, "bookworm-thumbnail-generator", {
      repositoryName: "bookworm/thumbnail-generator"
    });

    this.thumbnailGeneratorDockerImageRepository.addLifecycleRule({
      tagStatus: TagStatus.UNTAGGED,
      maxImageAge: Duration.days(14)
    });

    this.thumbnailGeneratorDockerImageRepository.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Amazon S3 Bucket for code artifacts uploaded from Amazon CodeGuru.

    const codeGuruArtifactsBucket = new Bucket(this, "AmazonCodeGuruArtifactsBucket", {
      bucketName: `codeguru-reviewer-${props.organizationName}-${props.repositoryName}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    codeGuruArtifactsBucket.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new CfnOutput(this, "BucketNameForIntegratingGithubWithAmazonCodeGuruReviewer", {
      value: codeGuruArtifactsBucket.bucketName
    });

    // GitHub OIDC provider.

    const oidcProvider = new CfnOIDCProvider(this, "GitHubOIDCProvider", {
      url: "https://token.actions.githubusercontent.com",

      clientIdList: [
        "sts.amazonaws.com"
      ],

      thumbprintList: [
        // This value is taken from here:
        // https://github.blog/changelog/2022-01-13-github-actions-update-on-oidc-based-deployments-to-aws

        "6938fd4d98bab03faadb97b34396831e3780aea1"
      ]
    });

    // GitHub OIDC role for Amazon CodeGuru Reviewer.

    const roleForAmazonCodeGuruReviewer = new Role(this, "GitHubOIDCRoleForAmazonCodeGuruReviewer", {
      roleName: "amazon-codeguru-reviewer-oidc-web-identity-role",
      assumedBy:
        new WebIdentityPrincipal(
          oidcProvider.ref,
          {
            "StringLike": {
              "token.actions.githubusercontent.com:sub": `repo:${props.organizationName}/${props.repositoryName}:*`
            },
            "StringEquals": {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
            }
          }
        )
    });

    roleForAmazonCodeGuruReviewer.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonCodeGuruReviewerFullAccess")
    );

    roleForAmazonCodeGuruReviewer.addToPolicy(
      new statement.S3()
        .allow()
        .onAllResources()
        .toListAllMyBuckets()
    );

    roleForAmazonCodeGuruReviewer.addToPolicy(
      new statement.S3()
        .allow()
        .on(codeGuruArtifactsBucket.bucketArn)
        .toListBucket()
    );

    roleForAmazonCodeGuruReviewer.addToPolicy(
      new statement.S3()
        .allow()
        .on(`${codeGuruArtifactsBucket.bucketArn}/*`)
        .toGetObject()
        .toGetObjectAcl()
        .toPutObject()
        .toPutObjectAcl()
        .toDeleteObject()
    );

    new CfnOutput(this, "RoleARNForIntegratingGitHubWithAmazonCodeGuruReviewer", {
      value: roleForAmazonCodeGuruReviewer.roleArn
    });

    // GitHub OIDC role for Amazon ECR integration.

    const roleForAmazonECR = new Role(this, "GitHubOIDCRoleForAmazonECR", {
      roleName: "amazon-ecr-oidc-web-identity-role",
      assumedBy:
        new WebIdentityPrincipal(
          oidcProvider.ref,
          {
            "StringLike": {
              "token.actions.githubusercontent.com:sub": `repo:${props.organizationName}/${props.repositoryName}:*`
            },
            "StringEquals": {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
            }
          }
        )
    });

    roleForAmazonECR.addToPolicy(
      new statement.Ecr()
        .allow()
        .onAllResources()
        .toGetAuthorizationToken()
    );

    roleForAmazonECR.addToPolicy(
      new statement.Ecr()
        .allow()
        .on(this.thumbnailGeneratorDockerImageRepository.repositoryArn)
        .toCompleteLayerUpload()
        .toUploadLayerPart()
        .toInitiateLayerUpload()
        .toBatchCheckLayerAvailability()
        .toPutImage()
    );

    new CfnOutput(this, "RoleARNForIntegratingGitHubWithAmazonECR", {
      value: roleForAmazonECR.roleArn
    });
  }
}
