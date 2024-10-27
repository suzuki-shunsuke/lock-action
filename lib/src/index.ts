import * as core from "@actions/core";
import * as github from "@actions/github";

export const rootTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic

type Input = {
  branch: string;
  historyBranchPrefix: string;
  branchPrefix: string;
  githubToken: string;
  owner: string;
  repo: string;
  message: string;
  disable_history: boolean;
};

export const updateHistoryBranch = async (input: Input, msg: string): Promise<any> => {
  if (input.disable_history) {
    core.info("The history branch is disabled");
    return;
  }

  const octokit = github.getOctokit(input.githubToken);

  const historyBranch = `${input.historyBranchPrefix}${input.branch}`;
  const historyRef = `heads/${historyBranch}`;
  try {
    // Get the history branch
    const result = await octokit.graphql<any>(`query($owner: String!, $repo: String!, $ref: String!) {
  repository(owner: $owner, name: $repo) {
    ref(qualifiedName: $ref) {
      prefix
      name
      target {
        ... on Commit {
          oid
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
      ref: historyBranch,
    });

    // If the history exists, adds the empty commit to it
    const commit = await octokit.rest.git.createCommit({
      owner: input.owner,
      repo: input.repo,
      message: msg,
      tree: result.repository.ref.target.tree.oid,
      parents: [result.repository.ref.target.oid],
    });
    await octokit.rest.git.updateRef({
      owner: input.owner,
      repo: input.repo,
      ref: historyRef,
      sha: commit.data.sha,
    });
    core.info(`The branch ${historyBranch} has been updated`);
  } catch (error: any) { // https://github.com/octokit/rest.js/issues/266
    if (!(error.status === 404 && error.message.includes("Not Found"))) {
      core.error(`failed to update a history branch ${historyBranch}: ${error.message}`);
      throw error;
    }

    // If the history branch doesn't exist, create it
    const commit = await octokit.rest.git.createCommit({
      owner: input.owner,
      repo: input.repo,
      message: msg,
      tree: rootTree,
    });
    await octokit.rest.git.createRef({
      owner: input.owner,
      repo: input.repo,
      ref: `refs/${historyRef}`,
      sha: commit.data.sha,
    });
    core.info(`The branch ${historyBranch} has been created`);
    return;
  }
};

export const getMsg = (input: Input): string => {
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
  return JSON.stringify(metadata, null, "  ");
};

export const unlock = async () => {
  run({
    branch: core.getInput("branch"),
    branchPrefix: core.getInput("branch_prefix"),
    historyBranchPrefix: core.getInput("history_branch_prefix"),
    githubToken: core.getInput("github_token"),
    owner: core.getInput("repo_owner") || process.env.GITHUB_REPOSITORY_OWNER || "",
    repo: core.getInput("repo_name") || (process.env.GITHUB_REPOSITORY || "").split("/")[1],
    message: core.getInput("message"),
    disable_history: core.getBooleanInput("disable_history"),
  });
};

const run = async (input: Input) => {
  const octokit = github.getOctokit(input.githubToken);

  const msg = getMsg(input);

  const branch = `${input.branchPrefix}${input.branch}`;
  const ref = `refs/heads/${branch}`;

  try {
    const commit = await octokit.rest.git.deleteRef({
      owner: input.owner,
      repo: input.repo,
      ref: `heads/${branch}`,
    });
  } catch (error: any) { // https://github.com/octokit/rest.js/issues/266
    if (!(error.status === 404 && error.message.includes("Reference does not exist"))) {
      throw error;
    }
    // If the lock branch doesn't exist, the key is already unlocked
    core.notice("the key is already unlocked");
    core.setOutput("already_unlocked", true);
    return;
  }
  core.setOutput("already_unlocked", false);
  core.info(`The branch ${branch} has been deleted`);

  await updateHistoryBranch(input, msg);
}
