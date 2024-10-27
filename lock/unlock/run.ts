import * as core from "@actions/core";
import * as github from "@actions/github";
import * as lib from "lib";

type Input = {
  branch: string;
  branchPrefix: string;
  historyBranchPrefix: string;
  githubToken: string;
  owner: string;
  repo: string;
  message: string;
  sha: string;
  disable_history: boolean;
};

export const main = async () => {
  run({
    branch: core.getInput("branch"),
    branchPrefix: core.getInput("branch_prefix"),
    historyBranchPrefix: core.getInput("history_branch_prefix"),
    githubToken: core.getInput("github_token"),
    owner: core.getInput("repo_owner") || process.env.GITHUB_REPOSITORY_OWNER || "",
    repo: core.getInput("repo_name") || (process.env.GITHUB_REPOSITORY || "").split("/")[1],
    message: core.getInput("message"),
    sha: process.env.GITHUB_SHA || "",
    disable_history: core.getBooleanInput("disable_history"),
  });
};

const run = async (input: Input) => {
  const octokit = github.getOctokit(input.githubToken);

  const metadata: any = {
    message: input.message,
    status: "unlock",
    actor: github.context.actor,
    github_actions_workflow_run_url: `${github.context.serverUrl}/${input.owner}/${input.repo}/actions/runs/${github.context.runId}`,
  };
  if (github.context.payload.pull_request) {
    metadata.pull_request_number = github.context.payload.pull_request.number;
    metadata.github_actions_workflow_run_url += `?pr=${metadata.pull_request_number}`;
  }
  // Remove links to pull requests because they are noisy in pull request timeline.
  const msg = JSON.stringify(metadata, null, "  ");

  const branch = `${input.branchPrefix}${input.branch}`;
  const ref = `refs/heads/${branch}`;

  try {
    const commit = await octokit.rest.git.deleteRef({
      owner: input.owner,
      repo: input.repo,
      ref: `heads/${branch}`,
    });
  } catch (error: any) { // https://github.com/octokit/rest.js/issues/266
    if (!(error.status === 404 && error.message.includes("Not Found"))) {
      throw error;
    }
    // If the lock branch doesn't exist, the key is already unlocked
    core.notice("the key is already unlocked");
    core.setOutput("already_unlocked", true);
    return;
  }
  core.setOutput("already_unlocked", false);
  core.info(`The branch ${branch} has been deleted`);

  await lib.updateHistoryBranch(input, msg);
}
