import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";

export const lock = async (input: lib.Input): Promise<any> => {
    const octokit = github.getOctokit(input.githubToken);

    const branch = `${input.keyPrefix}${input.key}`;
    const ref = `heads/${branch}`;
    try {
        // Get the branch
        const result = await octokit.graphql<any>(`query($owner: String!, $repo: String!, $ref: String!) {
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
}`, {
            owner: input.owner,
            repo: input.repo,
            ref: branch,
        });

        const metadata = JSON.parse(result.repository.ref.target.message);
        switch (metadata.state) {
            case "lock":
                // The key has already been locked
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
                await octokit.rest.git.updateRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: ref,
                    sha: commit.data.sha,
                });
                core.info(`The key ${input.key} has been locked`);
                core.saveState(`got_lock`, true);
                return;
            default:
                throw new Error(`The state of key ${input.key} is invalid ${metadata.state}`);
        }
    } catch (error: any) { // https://github.com/octokit/rest.js/issues/266
        if (!(error.status === 404 && error.message.includes("Not Found"))) {
            core.error(`failed to get a key ${input.key}: ${error.message}`);
            throw error;
        }
        // If the key doesn't exist, create the key
        const commit = await octokit.rest.git.createCommit({
            owner: input.owner,
            repo: input.repo,
            message: lib.getMsg(input),
            tree: lib.rootTree,
        });
        await octokit.rest.git.createRef({
            owner: input.owner,
            repo: input.repo,
            ref: `refs/${ref}`,
            sha: commit.data.sha,
        });
        core.info(`The key ${input.key} has been locked`);
        core.saveState(`got_lock`, true);
        return;
    }
};
