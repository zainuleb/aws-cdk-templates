#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsCdkprojectnameStack } from "../lib/aws-cdk-projectname";
import { devProps } from "../config";

const app = new cdk.App();
new AwsCdkprojectnameStack(app, "AwsCdkprojectnameStack", devProps);
