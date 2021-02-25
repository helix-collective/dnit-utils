// dnit tasks relating to git
import { Task, task, TaskContext } from "./dnit-deps.ts";
import { log, semver } from "./deps.ts";

import {
  gitFetchTags,
  gitIsClean,
  gitLastCommitMessage,
  gitLatestTag,
} from "./git.ts";
import { confirmation } from "./io.ts";
import { runConsole } from "./process.ts";

export const fetchTags = task({
  name: "fetch-tags",
  description: "Git remote fetch tags",
  action: async () => {
    await gitFetchTags();
  },
  uptodate: () => false,
});

export const requireCleanGit = task({
  name: "git-is-clean",
  description: "Check git status is clean",
  action: async (ctx: TaskContext) => {
    type Args = {
      "ignore-unclean"?: true;
    };
    const args: Args = ctx.args as Args;
    if (args["ignore-unclean"]) {
      return;
    }
    if (!await gitIsClean()) {
      throw new Error("Unclean git status");
    }
  },
  uptodate: () => false,
});

export function makeGitTagTask(tagPrefix: string): Task {
  return task({
    name: "tag",
    description: "Run git tag",
    action: async (ctx: TaskContext) => {
      const current = await gitLatestTag(tagPrefix);

      type Args = {
        "major"?: true;
        "minor"?: true;
        "patch"?: true;
        "message"?: string;
        "origin"?: string;
        "dry-run"?: true;
      };
      const args: Args = ctx.args as Args;
      const increment: "major" | "minor" | "patch" = args.major
        ? "major"
        : (args.minor ? "minor" : ("patch"));
      const next = semver.inc(current, increment);

      const tagMessage = args.message || `Tag ${increment} to ${next}`;
      const tagName = `${tagPrefix}${next}`;
      const dryRun = args["dry-run"] || false;

      const origin = args.origin || `origin`;

      const gitLastCommit = await gitLastCommitMessage();
      console.log("Last commit: " + gitLastCommit);

      const conf = await confirmation(
        `Git tag and push ${tagMessage} tagName?`,
        false,
      );
      if (conf) {
        const cmds = dryRun ? ["echo"] : [];

        await runConsole(
          cmds.concat(["git", "tag", "-a", "-m", tagMessage, tagName]),
        );
        await runConsole(cmds.concat(["git", "push", origin, tagName]));
        log.info(
          `${
            dryRun ? "(dry-run) " : ""
          }Git tagged and pushed ${tagPrefix}${next}`,
        );
      } else {
        throw new Error("Aborted");
      }

      if (dryRun) {
        throw new Error("Dry run");
      }
    },
    deps: [
      requireCleanGit,
      fetchTags,
    ],
    uptodate: () => false,
  });
}
