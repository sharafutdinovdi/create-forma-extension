# Contributing

Development requires Node.js 20 or later and Git.
The initializer has no npm dependencies to install.

## Template changes

Clone [autodesk-forma-extension-template](https://github.com/sharafutdinovdi/autodesk-forma-extension-template) beside this repository.
Make application changes in that repository, then regenerate the bundled files:

```sh
npm run build
git diff -- template
```

The source allowlist and generated README trimming live in `scripts/sync-template.mjs`.
The committed `template/` must remain usable without the sibling repository.

## Verification

Run the initializer in a new temporary directory:

```sh
project_dir=$(mktemp -d)
node bin/create-forma-extension.mjs "$project_dir" --name "Demo Extension" --yes --no-git
(cd "$project_dir" && npm install && npm run typecheck && npm run build)
rm -rf "$project_dir"
npm pack --dry-run
```

Verify directory refusal, `--force`, interactive defaults, `--help`, `--version` and Git initialization when changing CLI behaviour.
The CI workflow checks a packed initializer and builds its generated project on Node.js 20 and 22.
Pull requests should describe observable behaviour and include relevant verification output.
