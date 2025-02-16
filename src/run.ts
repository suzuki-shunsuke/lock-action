import * as core from "@actions/core";
import * as lib from "./lib";
import * as unlock from "./unlock";
import * as lock from "./lock";
import * as check from "./check";
import * as post from "./post";

export const main = async () => {
  run({
    post: core.getState("post"),
    mode: core.getInput("mode", { required: true }),
    historyMode: core.getInput("history_mode", { required: true }),
    key: core.getInput("key", { required: true }),
    keyPrefix: core.getInput("key_prefix"),
    githubToken: core.getInput("github_token"),
    owner:
      core.getInput("repo_owner") || process.env.GITHUB_REPOSITORY_OWNER || "",
    repo:
      core.getInput("repo_name") ||
      (process.env.GITHUB_REPOSITORY || "").split("/")[1],
    message: core.getInput("message"),
    ignoreAlreadyLockedError: core.getBooleanInput(
      "ignore_already_locked_error",
    ),
    waitIntervalSeconds: parseInt(core.getInput("wait_interval_seconds"), 10),
    maxWaitSeconds: parseInt(core.getInput("max_wait_seconds"), 10),
    failIfLocked: core.getBooleanInput("fail_if_locked"),
  });
};

const run = async (input: lib.Input) => {
  if (input.post) {
    post.post(input);
    return;
  }
  core.saveState("post", "true");
  switch (input.mode) {
    case "lock":
      lock.lock(input);
      break;
    case "unlock":
      unlock.unlock(input);
      break;
    case "check":
      check.check(input);
      break;
    default:
      throw new Error(`Invalid mode: ${input.mode}`);
  }
};
