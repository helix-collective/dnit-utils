import { run, runProcess } from "../process.ts";

import { AwsRegion, AwsAccountId } from "../types.ts";

export async function getAwsCliVersion(): Promise<string> {
  const awsCliVerStr = await run(["aws", "--version"]);
  const versionStr = awsCliVerStr.replaceAll(/aws-cli\/([0-9.]+).*/g, "$1");
  return versionStr;
}

export async function dockerAwsLogin(
  awsRegion: AwsRegion,
  awsAccountId: AwsAccountId,
) {
  // https://docs.aws.amazon.com/AmazonECR/latest/userguide/Registries.html

  const dockerLoginPassword = await run(
    ["aws", "ecr", "get-login-password", "--region", awsRegion],
  );
  const dockerRepoUrl = `${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com`;
  await runProcess({
    in: "piped",
    out: "inherit",
    inp: dockerLoginPassword, // pass password in on stdin
    cmd: [
      "docker",
      "login",
      "--username",
      "AWS",
      "--password-stdin",
      dockerRepoUrl,
    ],
  });
}
