import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";
import { setInterval } from "timers/promises";

enum State {
  AlreadyLocked,
  NotLocked,
  FailedToCheckLock,
}

type Result = {
  state: State;
  metadata: any;
};

export const check = async (input: lib.Input) => {
  const metadata = await _check(input);
  const s = JSON.stringify(metadata ?? {});
  core.setOutput("result", s);
  core.info(`result: ${s}`);
  const alreadyLocked = metadata?.state === "lock";
  core.setOutput("already_locked", alreadyLocked);
  core.info(`already_locked: ${alreadyLocked}`);
  if (alreadyLocked && input.failIfLocked) {
    core.error(`The key ${input.key} has already been locked.
actor: ${metadata.actor}
datetime: ${metadata.datetime}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
    throw new Error(`The key ${input.key} has already been locked`);
  }
};

const _check = async (input: lib.Input): Promise<lib.Metadata | undefined> => {
  let metadata = await __check(input);
  if (
    input.maxWaitSeconds === 0 ||
    metadata === undefined ||
    metadata.state !== "lock"
  ) {
    return metadata;
  }
  core.info(`The key ${input.key} has already been locked. Waiting...
actor: ${metadata.actor}
datetime: ${metadata.datetime}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
  for await (const startTime of setInterval(
    input.waitIntervalSeconds * 1000,
    Date.now(),
  )) {
    const now = Date.now();
    metadata = await __check(input);
    if (metadata === undefined || metadata.state !== "lock") {
      return metadata;
    }
    if (now - startTime > input.maxWaitSeconds * 1000) {
      return metadata;
    }
    core.info(`The key ${input.key} has already been locked. Waiting...
actor: ${metadata.actor}
datetime: ${metadata.datetime}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
  }
  return metadata;
};

const __check = async (input: lib.Input): Promise<lib.Metadata | undefined> => {
  const octokit = github.getOctokit(input.githubToken);

  const branch = `${input.keyPrefix}${input.key}`;
  const ref = `heads/${branch}`;
  try {
    // Get the branch
    const result = await octokit.graphql<any>(
      `query($owner: String!, $repo: String!, $ref: String!) {
  repository(owner: $owner, name: $repo) {
    ref(qualifiedName: $ref) {
      prefix
      name
      target {
        ... on Commit {
          oid
          message
          committedDate
          tree {
            oid
          }
        } 
      }
    }
  }
}`,
      {
        owner: input.owner,
        repo: input.repo,
        ref: branch,
      },
    );
    core.debug(`result: ${JSON.stringify(result)}`);
    if (!result.repository.ref) {
      return undefined;
    }
    const metadata = lib.extractMetadata(
      result.repository.ref.target.message,
      input.key,
    );

    metadata.datetime = result.repository.ref.target.committedDate;
    return metadata;
  } catch (error: any) {
    // https://github.com/octokit/rest.js/issues/266
    core.error(`failed to get a key ${input.key}: ${error.message}`);
    throw error;
  }
};
