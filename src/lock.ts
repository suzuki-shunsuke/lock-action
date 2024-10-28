import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";

export const lock = async (input: lib.Input): Promise<any> => {
  const octokit = github.getOctokit(input.githubToken);

  const branch = `${input.keyPrefix}${input.key}`;
  const ref = `heads/${branch}`;
  let result: any;
  try {
    // Get the branch
    result = await octokit.graphql<any>(
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
  } catch (error: any) {
    // https://github.com/octokit/rest.js/issues/266
    core.error(`failed to get a key ${input.key}: ${error.message}`);
    throw error;
  }
  core.debug(`result: ${JSON.stringify(result)}`);
  if (!result.repository.ref) {
    // If the key doesn't exist, create the key
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
      throw new Error(
        `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
      );
    }
    core.info(`The key ${input.key} has been locked`);
    core.saveState(`got_lock`, true);
    return;
  }
  const metadata = lib.extractMetadata(
    result.repository.ref.target.message,
    input.key,
  );
  switch (metadata.state) {
    case "lock":
      // The key has already been locked
      core.setOutput("already_locked", true);
      core.error(`The key ${input.key} has already been locked
actor: ${metadata.actor}
date: ${metadata.committedDate}
workflow: ${metadata.github_actions_workflow_run_url}
message: ${metadata.message}`);
      throw new Error(`The key ${input.key} has already been locked`);
    case "unlock":
      // lock
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
        throw new Error(
          `Failed to acquire lock. Probably the key ${input.key} has already been locked`,
        );
      }
      core.info(`The key ${input.key} has been locked`);
      core.saveState(`got_lock`, true);
      return;
    default:
      throw new Error(
        `The state of key ${input.key} is invalid ${metadata.state}`,
      );
  }
  return;
};
