import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import * as path from "path";

type Input = {
  branch: string;
  branchPrefix: string;
  historyBranchPrefix: string;
  githubToken: string;
  owner: string;
  repo: string;
  message: string;
  sha: string;
};

type Issue = {
  url: string;
  number: number;
  state: string;
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
  });
};

const rootTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic

const run = async (input: Input) => {
  // Create the remote branch
  const octokit = github.getOctokit(input.githubToken);

  // const tree = await octokit.rest.git.createTree({
  //   owner: input.owner,
  //   repo: input.repo,
  //   tree: [],
  // });

  // const parent = await octokit.rest.git.getCommit({
  //   owner: input.owner,
  //   repo: input.repo,
  //   commit_sha: input.sha,
  // });

  const commit = await octokit.rest.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: input.message,
    // tree: parent.data.tree.sha,
    // tree: tree.data.sha,
    tree: rootTree,
  });

  const ref = `refs/heads/${input.branchPrefix}${input.branch}`;

  try {
  } catch (error: unknown) {
    if (!(error instanceof RequestError && error.status === 422 && error.message === "Reference already exists")) {
      // If it fails to create the branch, it fails
      throw error;
    }
    // If the remote branch has already existed, the key is being locked
    core.setOutput("already_locked", true);
    return;
  }
  core.setOutput("already_locked", false);

  const historyRef = `refs/heads/${input.historyBranchPrefix}${input.branch}`;
  try {
    // Get the history branch
    const ref = await octokit.rest.git.getRef({
      owner: input.owner,
      repo: input.repo,
      ref: historyRef,
    });
    // If the history exists, adds the empty commit to it
    const newHistoryCommit = await octokit.rest.git.createCommit({
      owner: input.owner,
      repo: input.repo,
      message: input.message,
      tree: ref.data.object.sha,
    });
    octokit.rest.git.updateRef({
      owner: input.owner,
      repo: input.repo,
      ref: historyRef,
      sha: newHistoryCommit.data.sha,
    });
  } catch (error: unknown) {
    if (!(error instanceof RequestError && error.status === 404 && error.message === "Not Found")) {
      throw error;
    }

    // If the history branch doesn't exist, create it
    const newHistoryCommit = await octokit.rest.git.createCommit({
      owner: input.owner,
      repo: input.repo,
      message: input.message,
      tree: rootTree,
    });
    octokit.rest.git.createRef({
      owner: input.owner,
      repo: input.repo,
      ref: historyRef,
      sha: commit.data.sha,
    });
    return;
  }
}
