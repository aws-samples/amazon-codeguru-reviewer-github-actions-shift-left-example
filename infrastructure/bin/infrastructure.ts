#!/usr/bin/env node

import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";

import { InfrastructureSharedStack } from "../lib/infrastructure-shared-stack";
import { InfrastructureAppStack } from "../lib/infrastructure-app-stack";
import { InfrastructureIDEStack } from "../lib/infrastructure-ide-stack";

const account = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT || null;
const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || null;

const userName = process.env.AWS_USERNAME || null;

const githubOrganizationName = process.env.GITHUB_ORG_NAME || null;
const githubRepositoryName = process.env.GITHUB_REPO_NAME || null;

if (!account) {
  throw new Error("Environment variable `AWS_ACCOUNT_ID` or `CDK_DEFAULT_ACCOUNT` is required.");
}

if (!region) {
  throw new Error("Environment variable `AWS_REGION` or `CDK_DEFAULT_REGION` is required.");
}

if (!userName) {
  throw new Error("Environment variable `AWS_USERNAME` is required.");
}

if (!githubOrganizationName) {
  throw new Error("Environment variable `GITHUB_ORG_NAME` is required.");
}

if (!githubRepositoryName) {
  throw new Error("Environment variable `GITHUB_REPO_NAME` is required.");
}

const SHARED_ENVIRONMENT_SETTINGS = {
  env: { account, region }
};

const app = new cdk.App();

const sharedInfrastructure = new InfrastructureSharedStack(app, "Infrastructure-Shared", {
  ...SHARED_ENVIRONMENT_SETTINGS,

  organizationName: githubOrganizationName,
  repositoryName: githubRepositoryName
});

new InfrastructureIDEStack(app, "Infrastructure-IDE", {
  ...SHARED_ENVIRONMENT_SETTINGS,

  userName,
  instanceTypeIDE: InstanceType.of(InstanceClass.M5, InstanceSize.LARGE)
});

new InfrastructureAppStack(app, "Infrastructure-App", {
  ...SHARED_ENVIRONMENT_SETTINGS,

  thumbnailGeneratorDockerImageRepository: sharedInfrastructure.thumbnailGeneratorDockerImageRepository
});
