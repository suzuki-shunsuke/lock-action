# lock-action

GitHub Action for lock mechanism using GitHub branches

Lock Mechanism is useful in CI workflows, like when you need to prevent simultaneous deployments or block deployments during maintenance.

## Features

- No dependencies on external services like AWS or GCP
- No reliance on shell or external commands such as git
- Achieves locking using GitHub branches
- Manage branches via GitHub API without git command. You don't have to checkout repositories by [actions/checkout](https://github.com/actions/checkout)
- Records lock and unlock histories
- Supports waiting until a lock is released

## How to use

This action requires two inputs: `key` and `mode`.

- `key`: an explicit identifier for the lock, which you can adjust by service and environment.
- `mode`: the action’s operational mode, which can be one of these:
  - `lock`: Acquires a lock
  - `unlock`: Releases a lock
  - `check`: Checks the lock status

`mode: lock`:

```yaml
steps:
  - name: Acquire a lock for a key `foo` before deploying an application
    uses: suzuki-shunsuke/lock-action@latest
    with:
      mode: lock
      key: foo
  - run: bash deploy.sh foo
```

`mode: unlock`:

```yaml
steps:
  - name: Release a lock
    uses: suzuki-shunsuke/lock-action@latest
    with:
      mode: unlock
      key: foo
```

`mode: check`:

```yaml
steps:
  - name: Check if a key is being locked
    id: check
    uses: suzuki-shunsuke/lock-action@latest
    with:
      mode: check
      key: foo
  - run: bash deploy.sh foo
    if: steps.check.outputs.locked != 'true'
```

You can also use `post_unlock: "true"` to release a lock automatically in a post step.

```yaml
- uses: suzuki-shunsuke/lock-action@latest
  with:
    mode: lock
    key: foo
    post_unlock: "true"
```

By default, `mode: lock` will fail if the key is already locked.
Set `ignore_already_locked_error: "true"` to avoid this.

```yaml
- uses: suzuki-shunsuke/lock-action@latest
  with:
    key: foo
    mode: lock
    ignore_already_locked_error: "true"
```

To force `mode: check` to fail if a key is locked, use `fail_if_locked: "true"`.

```yaml
# This step fails if the key `foo` is being locked.
- uses: suzuki-shunsuke/lock-action@latest
  with:
    mode: check
    key: foo
    fail_if_locked: "true"
```

To wait until a lock is released, use `max_wait_seconds` and `wait_interval_seconds`.

```yaml
- uses: suzuki-shunsuke/lock-action@latest
  with:
    mode: lock
    key: default
    # Try to acquire a lock every 10 seconds until acquiring a lock or 60 seconds pass.
    max_wait_seconds: "60"
    wait_interval_seconds: "10"
```

These inputs are also available for `mode: check`.

```yaml
- uses: suzuki-shunsuke/lock-action@latest
  with:
    mode: check
    key: default
    # Check a lock every 5 seconds until the lock is released or 60 seconds pass
    max_wait_seconds: "30"
    wait_interval_seconds: "5"
```

[#131](https://github.com/suzuki-shunsuke/lock-action/issues/131) [#135](https://github.com/suzuki-shunsuke/lock-action/pull/135) [>= v0.1.4](https://github.com/suzuki-shunsuke/lock-action/releases/tag/v0.1.4) You can check if this action can acquire the lock in later jobs using the output `locked`.
The output is useful if you want to release a lock in a later job.

```yaml
lock:
  runs-on: ubuntu-latest
  permissions:
    contents: write
  outputs:
    locked: ${{steps.lock.outputs.locked}}
  steps:
    - uses: suzuki-shunsuke/lock-action@c752be910ac812e0adc50316855416514d364b57 # v0.1.3
      id: lock
      with:
        mode: lock
        key: dev
    # ...

unlock:
  runs-on: ubuntu-latest
  needs: lock
  permissions:
    contents: write
  steps:
    - uses: suzuki-shunsuke/lock-action@c752be910ac812e0adc50316855416514d364b57 # v0.1.3
      if: needs.lock.outputs.locked == 'true'
      with:
        mode: unlock
        key: dev
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

## How It Works

This action manages locks by creating and updating GitHub branches.
Each lock’s state is tracked in the commit message of a branch named `${{inputs.key_prefix}}${{inputs.key}}` (default prefix: `lock__`, which can be customized with `key_prefix`).

Commit message format:

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

From these commit messages, you can see when and who (actor, workflow run, pull request number) acquired or released the lock.

![commits](https://storage.googleapis.com/zenn-user-upload/d6b27b221017-20241028.png)

![commit message](https://storage.googleapis.com/zenn-user-upload/d5bb8fcd470e-20241028.png)

Example links:

- [Branch list](https://github.com/suzuki-shunsuke/lock-action/branches/all?query=lock__&lastTab=overview)
- [Commit history for a specific lock](https://github.com/suzuki-shunsuke/lock-action/commits/lock__test-1/)

## Inputs / Outputs

Please see [action.yaml](action.yaml)

## Restriction of key_prefix and key inputs

This action creates branches `${{inputs.key_prefix}}${{inputs.key}}`, so `${{inputs.key_prefix}}${{inputs.key}}` must follow the rule of Git and GitHub branches.

- https://docs.github.com/en/get-started/using-git/dealing-with-special-characters-in-branch-and-tag-names
- https://git-scm.com/docs/git-check-ref-format

## LICENSE

[MIT](LICENSE)
