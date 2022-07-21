import { StackProps } from "aws-cdk-lib";

import { Repository } from "aws-cdk-lib/aws-ecr";

export interface InfrastructureAppStackProps extends StackProps {
  thumbnailGeneratorDockerImageRepository: Repository;
}
