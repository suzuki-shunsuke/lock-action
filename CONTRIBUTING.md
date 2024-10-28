# Contributing

Please read the following document.

- https://github.com/suzuki-shunsuke/oss-contribution-guide

## Requirements

- [aqua](https://aquaproj.github.io/): CLI Version Manager
  - [cmdx](https://github.com/suzuki-shunsuke/cmdx): Task Runner
- Node.js
  - [prettier](https://prettier.io/): Formatter

Install cmdx by aqua.

```sh
aqua i -l
```

After you update code, you have to run the following things.

- Build TypeScript
- Test JavaScript Action
- Format code

## Node.js version management

This project depends on Node.js, and there are a lot of Node.js version managers.
This project supports a lot of Node.js version managers.

- [aqua](https://aquaproj.github.io/): [aqua/node.yaml](aqua/node.yaml)
- [NVM](https://github.com/nvm-sh/nvm): [.nvmrc](.nvmrc)
- [.node-version](.node-version): https://github.com/shadowspawn/node-version-usage
  - asdf, mise, fnm, nodeenv, etc
- [volta](https://volta.sh/): [package.json](package.json)

These versions must be same.

## Node.js package manager

We manage Node.js packages using npm, not [yarn](https://yarnpkg.com/) and [pnpm](https://pnpm.io/).

## `dist` directories aren't committed

We don't manage transpiled JavaScript files in the main branch and feature branches anymore.

## Test JavaScript Actions

Coming soon.

## Format code

```sh
cmdx fmt
```

## Manual test

We provide some automatic tests such as unit tests, but sometimes the automatic tests aren't enough so you have to test your changes on your environment.
You have to build GitHub Actions workflows with this action and test your changes on the workflows.

When a pull request is created or updated, the branch `pr/<pull request number>` is also created or updated by GitHub Actions.

- https://github.com/suzuki-shunsuke/lock-action/actions/workflows/create-pr-branch.yaml
- https://github.com/suzuki-shunsuke/lock-action/blob/main/.github/workflows/create-pr-branch.yaml

> [!WARNING]
> These branches aren't created and updated against pull requests from fork repositories.
> Maintainers have to run [the workflow](https://github.com/suzuki-shunsuke/lock-action/actions/workflows/create-pr-branch.yaml) manually.

You can test your pull request version by `pr/<pull request number>`.

For example, if you want to test the pull request [#3](https://github.com/suzuki-shunsuke/lock-action/pull/3),
you can update this action's version of your workflows to `pr/3`.

e.g.

```yaml
- uses: suzuki-shunsuke/lock-action@pr/3
```
