import { StackProps } from "aws-cdk-lib";

import { InstanceType } from "aws-cdk-lib/aws-ec2";

export interface InfrastructureIDEStackProps extends StackProps {
  userName: string;

  instanceTypeIDE?: InstanceType;
}
