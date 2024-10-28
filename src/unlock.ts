import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";

export const unlock = async (input: lib.Input): Promise<any> => {
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
    // If the key doesn't exist, do nothing
    core.info(`The key ${input.key} has already been unlocked`);
    return;
  }

  const metadata = lib.extractMetadata(
    result.repository.ref.target.message,
    input.key,
  );
  switch (metadata.state) {
    case "lock":
      // unlock
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
        core.notice(
          `Failed to unlock the key ${input.key}. Probably the key has already been unlocked`,
        );
        return;
      }
      core.info(`The key ${input.key} has been unlocked`);
      return;
    case "unlock":
      core.info(`The key ${input.key} has already been unlocked`);
      return;
    default:
      throw new Error(
        `The state of key ${input.key} is invalid ${metadata.state}`,
      );
  }
};
