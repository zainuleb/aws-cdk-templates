import { join } from "path";
import { readFileSync } from "fs";
import { parse } from "yaml";

const configFilePath = join(__dirname, "config.yaml");
const readConfigFile = readFileSync(configFilePath, "utf8");
const config = parse(readConfigFile);

export const stackName = config.stackName;

export const devProps = {
  stackName: config.dev.stackName,
  environmentType: config.dev.environmentType,
  branch: config.dev.branchName,
  pipelineName: config.dev.pipelineConfig.name,
  bucketName: config.dev.s3Config.bucketName,
  publicAccess: config.dev.s3Config.publicAccess,
  indexFile: config.dev.s3Config.indexFile,
  errorFile: config.dev.s3Config.errorFile,
  githubRepoOwner: config.githubRepoOwner,
  githubRepoName: config.githubRepoName,
};
