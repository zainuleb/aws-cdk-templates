#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsCdkSecondLineSupportStack } from "../lib/aws-cdk-second-line-support";
import { devProps } from "../config";

const app = new cdk.App();
new AwsCdkSecondLineSupportStack(
  app,
  "AwsCdksecond-line-supportStack",
  devProps
);
