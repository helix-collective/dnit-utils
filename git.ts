import { run, runConsole } from "./process.ts";

/** get the latest git tag
 * @param tagPrefix prefix to match on for tags.
 */
export async function gitLatestTag(tagPrefix: string): Promise<string> {
  const describeStr = await run(
    ["git", "describe", "--tags", "--match", `${tagPrefix}*`, "--abbrev=0"],
  );
  const find = new RegExp(`${tagPrefix}(.*)`);
  return describeStr.trim().replace(find, "$1");
}

/** get most recent git commit message */
export function gitLastCommitMessage(): Promise<string> {
  return run(["git", "log", "--pretty=oneline", "--abbrev-commit", "-1"]);
}

/** check if git is clean */
export async function gitIsClean(): Promise<boolean> {
  const gitStatus = await run(["git", "status", "--porcelain"]);
  return gitStatus.length === 0;
}

/** Fetch the git tags */
export async function gitFetchTags(): Promise<void> {
  await runConsole(["git", "fetch", "--tags"]);
  return;
}
