import { Stack, SecretValue, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import { CustomStackProps } from "../utils/interfaces";

import {
  Distribution,
  OriginAccessIdentity,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { PolicyStatement, CanonicalUserPrincipal } from "aws-cdk-lib/aws-iam";

export class AwsCdkSecondLineSupportStack extends Stack {
  constructor(scope: Construct, id: string, props: CustomStackProps) {
    super(scope, id, props);
    const websiteBucket = new Bucket(this, props.bucketName, {
      websiteIndexDocument: props.indexFile,
      publicReadAccess: props.publicAccess,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
    });

    const existingBucket = Bucket.fromBucketName(
      this,
      "ExistingBucket",
      props.pipelineBucket
    );

    const pipeline = new codepipeline.Pipeline(this, props.pipelineName, {
      pipelineName: props.pipelineName,
      artifactBucket: existingBucket,
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
            commands: [
              'echo "Installing dependencies..."',
              "npm install --force",
            ],
          },
          build: {
            commands: [
              'echo "Building the React app..."',
              "npm run build",
              "ls",
            ],
          },
        },
        artifacts: {
          "base-directory": "dist",
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

    const oai = new OriginAccessIdentity(this, "OAI");
    // Add a policy statement to the bucket policy to allow CloudFront access
    websiteBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [websiteBucket.arnForObjects("*")],
        principals: [
          new CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );
    const s3Origin = new S3Origin(websiteBucket, {
      originAccessIdentity: oai,
    });
    const distribution = new Distribution(
      this,
      `${props.stackName}-distribution`,
      {
        defaultBehavior: {
          origin: s3Origin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 404,
            responsePagePath: "/index.html",
            ttl: Duration.seconds(300),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 500,
            responsePagePath: "/index.html",
            ttl: Duration.seconds(300),
          },
        ],
        priceClass: PriceClass.PRICE_CLASS_100,
      }
    );

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
      value: distribution.distributionDomainName,
      description: "Website URL",
    });
  }
}
