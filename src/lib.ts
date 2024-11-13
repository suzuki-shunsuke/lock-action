import * as core from "@actions/core";
import * as github from "@actions/github";

export const rootTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"; // https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic

export type Input = {
  post: string;
  mode: string;
  key: string;
  keyPrefix: string;
  githubToken: string;
  owner: string;
  repo: string;
  message: string;
  ignoreAlreadyLockedError: boolean;
  maxWaitSeconds: number;
  waitIntervalSeconds: number;
};

export const getMsg = (input: Input): string => {
  const metadata: any = {
    message: input.message,
    state: input.mode,
    actor: github.context.actor,
    github_actions_workflow_run_url: `${github.context.serverUrl}/${input.owner}/${input.repo}/actions/runs/${github.context.runId}`,
  };
  if (github.context.payload.pull_request) {
    metadata.pull_request_number = github.context.payload.pull_request.number;
    metadata.github_actions_workflow_run_url += `?pr=${metadata.pull_request_number}`;
  }
  // Remove links to pull requests because they are noisy in pull request timeline.
  return `${input.mode} by ${github.context.actor}: ${input.message}
${JSON.stringify(metadata, null, "  ")}`;
};

type Metadata = {
  message: string;
  state: string;
  actor: string;
  github_actions_workflow_run_url: string;
  pull_request_number?: number;
};

export const extractMetadata = (message: string, key: string): any => {
  const idx = message.indexOf("\n");
  if (idx === -1) {
    throw new Error(`The message of key ${key} is invalid`);
  }
  return JSON.parse(message.slice(idx + 1));
};
