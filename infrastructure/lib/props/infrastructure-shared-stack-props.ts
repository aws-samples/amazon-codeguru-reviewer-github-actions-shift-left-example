import { StackProps } from "aws-cdk-lib";

export interface InfrastructureSharedStackProps extends StackProps {
  organizationName: string;
  repositoryName: string;
}
