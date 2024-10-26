import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Octokit } from "@octokit/core";
import * as path from "path";

type Input = {
  branch: string;
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
    githubToken: core.getInput("github_token"),
    owner: core.getInput("repo_owner") || process.env.GITHUB_REPOSITORY_OWNER || "",
    repo: core.getInput("repo_name") || (process.env.GITHUB_REPOSITORY || "").split("/")[1],
    message: core.getInput("message"),
    sha: process.env.GITHUB_SHA || "",
  });
};

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
    tree: "4b825dc642cb6eb9a060e54bf8d69288fbee4904", // https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic
  });

  const ref = `refs/heads/${input.branch}`;

  octokit.rest.git.createRef({
    owner: input.owner,
    repo: input.repo,
    ref,
    sha: commit.data.sha,
  });

  // If the remote branch has already existed, the key is being locked
  // If it fails to create the branch, it fails
  // Get the history branch
  // If the history branch doesn't exist, create it
  // If the history exists, adds the empty commit to it
}
