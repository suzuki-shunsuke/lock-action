import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";

export const lock = async (input: lib.Input): Promise<any> => {
  const branch = `${input.keyPrefix}${input.key}`;
  const ref = `heads/${branch}`;
  let result: any;
  try {
    // Get the branch
    result = await getKey(input, branch);
  } catch (error: any) {
    // https://github.com/octokit/rest.js/issues/266
    core.error(`failed to get a key ${input.key}: ${error.message}`);
    throw error;
  }
  core.debug(`result: ${JSON.stringify(result)}`);
  if (!result.repository.ref) {
    // If the key doesn't exist, create the key
    await createKey(input, ref);
    return;
  }
  const metadata = lib.extractMetadata(
    result.repository.ref.target.message,
    input.key,
  );
  switch (metadata.state) {
    case "lock":
      handleCaseLock(input, metadata, result);
    case "unlock":
      await createLock(input, ref, result);
      return;
    default:
      throw new Error(
        `The state of key ${input.key} is invalid ${metadata.state}`,
      );
  }
  return;
};

const getKey = async (input: lib.Input, branch: string): Promise<any> => {
  // Get the branch
  const octokit = github.getOctokit(input.githubToken);
  return await octokit.graphql<any>(
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
};

const createKey = async (input: lib.Input, ref: string) => {
  // If the key doesn't exist, create the key
  const octokit = github.getOctokit(input.githubToken);
  const commit = await octokit.rest.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: lib.getMsg(input),
    tree: lib.rootTree,
  });
  try {
    await octokit.rest.git.createRef({
      owner: input.owner,
      repo: input.repo,
      ref: `refs/${ref}`,
      sha: commit.data.sha,
    });
  } catch (error: any) {
    if (!error.message.includes("Reference already exists")) {
      throw error;
    }
    core.setOutput("already_locked", true);
    if (input.ignoreAlreadyLockedError) {
      core.info(
        `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
      );
      return;
    }
    throw new Error(
      `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
    );
  }
  core.info(`The key ${input.key} has been locked`);
  core.saveState(`got_lock`, true);
};

const handleCaseLock = (input: lib.Input, metadata: any, result: any) => {
  // The key has already been locked
  core.setOutput("already_locked", true);
  if (input.ignoreAlreadyLockedError) {
    core.info(`The key ${input.key} has already been locked
actor: ${metadata.actor}
datetime: ${result.repository.ref.target.committedDate}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
    return;
  }
  core.error(`The key ${input.key} has already been locked
actor: ${metadata.actor}
datetime: ${result.repository.ref.target.committedDate}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
  throw new Error(`The key ${input.key} has already been locked`);
};

const createLock = async (
  input: lib.Input,
  ref: string,
  result: any,
): Promise<any> => {
  // lock
  const octokit = github.getOctokit(input.githubToken);
  const commit = await octokit.rest.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: lib.getMsg(input),
    tree: result.repository.ref.target.tree.oid,
    parents: [result.repository.ref.target.oid],
  });
  try {
    await octokit.rest.git.updateRef({
      owner: input.owner,
      repo: input.repo,
      ref: ref,
      sha: commit.data.sha,
    });
  } catch (error: any) {
    if (!error.message.includes("Update is not a fast forward")) {
      throw error;
    }
    core.setOutput("already_locked", true);
    if (input.ignoreAlreadyLockedError) {
      core.info(
        `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
      );
      return;
    }
    throw new Error(
      `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
    );
  }
  core.info(`The key ${input.key} has been locked`);
  core.saveState(`got_lock`, true);
};
