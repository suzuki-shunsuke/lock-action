# lock-action

GitHub Action for lock mechanism using GitHub branches

## What's lock mechanism?

Lock mechanism enables you to prevent multiple processes from running the same task at the same time.
For example, if the deployment is run when pull requests are merged in the default branch, you can prevent the deployments from being run at the same time by acquiring lock before deployment.
Or you can also prevent Terraform from being run while splitting Terraform States.
This action enables you to manage lock in GitHub Actions Workflows.

## Features

- No dependency on services such as AWS and GCP
- No dependency on shell and external commands such as git
- Use GitHub branches to achieve lock mechanism
- Manage branches via GitHub API without git command. You don't have to checkout repositories by acitons/checkout
- Record lock and unlock histories

## How to use

Example 1. Lock while running deploy.sh:

```yaml
jobs:
  deploy-foo:
    runs-on: ubuntu-24.04
    permissions:
      contents: write # For lock and unlock
    steps:
      - uses: suzuki-shunsuke/lock-action@v0.1.1
        id: lock
        with:
          mode: lock # mandatory
          key: foo # mandatory
          post_unlock: "true" # optional. Unlock key in a post step
      - run: bash deploy.sh
```

By default, this action doesn't release a lock automatically even after the job has been completed.
If you want to release a lock automatically after the job, you can use the input `post_unlock: "true"`.

The action fails if the key has already been locked.
If you want to continue jobs, you can ignore the failure using the input `ignore_already_locked_error`.

```yaml
- uses: suzuki-shunsuke/lock-action@v0.1.1
  id: lock
  with:
    key: foo
    mode: lock
    ignore_already_locked_error: "true"
- run: echo "already locked"
  if: steps.lock.outputs.already_locked == 'true' # Refer the result via outputs
```

Example 2. Unlock

```yaml
- uses: suzuki-shunsuke/lock-action@v0.1.1
  with:
    mode: unlock
    key: foo
```

Example 3. Check if the key is being locked

```yaml
- uses: suzuki-shunsuke/lock-action@v0.1.1
  id: check
  with:
    mode: check
    key: foo
- run: echo "already locked"
  if: steps.check.outputs.already_locked == 'true' # Refer the result via outputs
```

## Available versions

> [!CAUTION]
> We don't add `dist/*.js` in the main branch and feature branches.
> So you can't specify `main` and feature branches as versions.
>
> ```yaml
> # This never works as dist/index.js doesn't exist.
> uses: suzuki-shunsuke/lock-action@main
> ```

The following versions are available.

1. [Release versions](https://github.com/suzuki-shunsuke/lock-action/releases)

```yaml
uses: suzuki-shunsuke/lock-action@v0.1.1
```

2. [Pull Request versions](https://github.com/suzuki-shunsuke/lock-action/branches/all?query=pr%2F&lastTab=overview): These versions are removed when we feel unnecessary. These versions are used to test pull requests.

```yaml
uses: suzuki-shunsuke/lock-action@pr/37
```

3. [latest branch](https://github.com/suzuki-shunsuke/lock-action/tree/latest): [This branch is built by CI when the main branch is updated](https://github.com/suzuki-shunsuke/lock-action/blob/latest/.github/workflows/main.yaml). Note that we push commits to the latest branch forcibly.

```yaml
uses: suzuki-shunsuke/lock-action@latest
```

Pull Request versions and the latest branch are unstable.
These versions are for testing.
You should use the latest release version in production.

## Example

[We provide an example workflow](https://github.com/suzuki-shunsuke/lock-action/actions/workflows/example.yaml) ([code](.github/workflows/example.yaml)) via [workflow_dispatch](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow).
To try this, please [fork this repository](https://github.com/suzuki-shunsuke/lock-action/fork) or copy [the workflow](.github/workflows/example.yaml).

![](https://storage.googleapis.com/zenn-user-upload/8334fc75cd1d-20241029.png)

1. lock: Lock the given key
1. unlock: Unlock the given key
1. check: Check if the key is being locked
1. terraform_plan: Check if the key is being locked before running terraform plan. The job would fail if the key is being locked.
1. terraform_apply: Lock the key for 120 seconds and release the lock. The job would fail if the key is being locked.

## How does it work?

This action creates and updates GitHub branches internally.
It manages the state of the key `key` using commit messages of the branch `${{inputs.key_prefix}}${{inputs.key}}`.
The default value of `key_prefix` is `lock__`, but you can change this by the input `key_prefix`.

The commit messages are like this:

```
unlock by suzuki-shunsuke: test
{
  "message": "test",
  "state": "unlock",
  "actor": "suzuki-shunsuke",
  "github_actions_workflow_run_url": "https://github.com/suzuki-shunsuke/test-github-action/actions/runs/11545637203?pr=237",
  "pull_request_number": 237
}
```

You can see when and who (actor, workflow run, pull request number) locks or unloks the key from commit messages.

![](https://storage.googleapis.com/zenn-user-upload/d6b27b221017-20241028.png)

![](https://storage.googleapis.com/zenn-user-upload/d5bb8fcd470e-20241028.png)

Example:

- A list of branches: https://github.com/suzuki-shunsuke/lock-action/branches/all?query=lock__&lastTab=overview
- https://github.com/suzuki-shunsuke/lock-action/commits/lock__test-1/

## Inputs / Outputs

Please see [action.yaml](action.yaml)

## Restriction of key_prefix and key inputs

This action creates branches `${{inputs.key_prefix}}${{inputs.key}}`, so `${{inputs.key_prefix}}${{inputs.key}}` must follow the rule of Git and GitHub branches.

- https://docs.github.com/en/get-started/using-git/dealing-with-special-characters-in-branch-and-tag-names
- https://git-scm.com/docs/git-check-ref-format

## Alternatives

There are some alternatives, but they don't meet our needs.

https://github.com/github/lock

This is an official action. We need a simpler action.

https://github.com/ben-z/gh-action-mutex

- High overhead due to Docker action
- Depend on shell and git
- Always release a lock in a post step

## LICENSE

[MIT](LICENSE)
