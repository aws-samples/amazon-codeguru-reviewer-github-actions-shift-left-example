import * as fs from "fs";
import * as path from "path";

import * as yaml from "js-yaml";

import { Stack, Tags, RemovalPolicy, Fn } from "aws-cdk-lib";
import { Construct } from "constructs";

import { CfnEnvironmentEC2 } from "aws-cdk-lib/aws-cloud9";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { CfnAssociation, CfnDocument } from "aws-cdk-lib/aws-ssm";

import { InfrastructureIDEStackProps } from "./props/infrastructure-ide-stack-props";

export class InfrastructureIDEStack extends Stack {
  public readonly outputBucket: Bucket;

  constructor(scope: Construct, id: string, props: InfrastructureIDEStackProps) {
    super(scope, id, props);

    const accountId = Stack.of(this).account;
    const region = Stack.of(this).region;

    // Amazon S3 Bucket for various logs.

    this.outputBucket = new Bucket(this, "Cloud9LogsBucket", {
      bucketName: `ide-infrastructure-stack-bucket-for-logs-in-${region}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    this.outputBucket.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // And then you can create AWS Cloud9 IDE instance if needed.
    // If the AWS Cloud9 has special tag applied SSM document kicks in and completes bootstrapping.

    if (props.instanceTypeIDE) {
      const content = fs.readFileSync(path.join(__dirname, "assets/aws-cloud9-bootstrap.yml")).toString();

      const document = new CfnDocument(this, "Cloud9IDEAutomationScript", {
        documentType: "Command",
        content: yaml.load(content)
      });

      new CfnAssociation(this, "Cloud9IDEAssociation", {
        name: Fn.ref(document.logicalId),
        outputLocation: {
          s3Location: {
            outputS3BucketName: this.outputBucket.bucketName,
            outputS3KeyPrefix: "aws-cloud9/bootstrapping-logs/"
          }
        },
        targets: [ { key: "tag:BootstrapViaSSM", values: [ "true" ] } ]
      });

      const ide = new CfnEnvironmentEC2(this, "Cloud9MainIDE", {
        name: `ide-for-${props.userName}`,
        description: `IDE for ${props.userName}.`,

        instanceType: props.instanceTypeIDE.toString(),

        ownerArn: `arn:aws:iam::${accountId}:user/${props.userName}`,

        connectionType: "CONNECT_SSM",
        automaticStopTimeMinutes: 60,

        imageId: "resolve:ssm:/aws/service/cloud9/amis/amazonlinux-2-x86_64"
      });

      // Kick-off SSM bootstrapping.
      Tags.of(ide).add("BootstrapViaSSM", "true");
    }
  }
}
