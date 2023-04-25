import { Stack, RemovalPolicy, SecretValue, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { CustomStackProps } from "../utils/interfaces";

export class AwsCdkprojectnameStack extends Stack {
  constructor(scope: Construct, id: string, props: CustomStackProps) {
    super(scope, id, props);

    const artifactsBucket = new Bucket(this, `${props.bucketName}-artifacts`, {
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const websiteBucket = new Bucket(this, props.bucketName, {
      websiteIndexDocument: props.indexFile,
      publicReadAccess: props.publicAccess,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const pipeline = new codepipeline.Pipeline(this, props.pipelineName, {
      pipelineName: props.pipelineName,
      artifactBucket: artifactsBucket,
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: props.githubRepoOwner,
      repo: props.githubRepoName,
      branch: props.branch,
      oauthToken: SecretValue.secretsManager("github-access-token-secret"),
      output: sourceOutput,
    });

    const buildProject = new PipelineProject(this, `${props.stackName}-build`, {
      projectName: `${props.stackName}-build`,

      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ['echo "Installing dependencies..."', "npm install"],
          },
          build: {
            commands: ['echo "Building the React app..."', "npm run build"],
          },
        },
        artifacts: {
          "base-directory": "build",
          files: ["**/*"],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "React_Build",
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [buildAction],
    });

    const deployAction = new codepipeline_actions.S3DeployAction({
      actionName: "Deploy_to_S3",
      input: buildOutput,
      bucket: websiteBucket,
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction],
    });

    new CfnOutput(this, "WebsiteURL", {
      value: websiteBucket.bucketWebsiteUrl,
      description: "Website URL",
    });
  }
}
