import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "./lib";

export const check = async (input: lib.Input): Promise<any> => {
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

        core.setOutput("result", result.repository.ref.target.message);
        const metadata = JSON.parse(result.repository.ref.target.message);
        core.setOutput("is_locked", metadata.state === "lock");
    } catch (error: any) { // https://github.com/octokit/rest.js/issues/266
        if (!(error.status === 404 && error.message.includes("Not Found"))) {
            core.error(`failed to get a key ${input.key}: ${error.message}`);
            throw error;
        }
        core.setOutput("result", {});
        core.setOutput("is_locked", false);
        return;
    }
};
