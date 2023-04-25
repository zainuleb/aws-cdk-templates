import { StackProps } from "aws-cdk-lib";

export interface CustomStackProps extends StackProps {
  environmentType: string;
  branch: string;
  pipelineName: string;
  bucketName: string;
  publicAccess: boolean;
  indexFile: string;
  errorFile: string;
  githubRepoOwner: string;
  githubRepoName: string;
}
