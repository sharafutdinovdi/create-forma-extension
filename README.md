# create-forma-extension

An npm initializer for Autodesk Forma extensions, with Vite, strict TypeScript and native Autodesk UI.
The initializer requires Node.js 20 or later and has zero runtime dependencies.

```sh
npm create forma-extension@latest my-extension
```

The command prompts for a display name, creates the project and initializes Git without a commit.
An omitted directory triggers a prompt with `forma-extension` as the default.
The default display name comes from the directory: `my-extension` becomes `My Extension`.
The package name is an ASCII slug of the display name.

```sh
cd my-extension
npm install
npm run dev
```

The fixture preview is available at [http://localhost:5173/?fixture=1](http://localhost:5173/?fixture=1) without a Forma licence.
Native controls load from Autodesk's CDN and require an internet connection.
The generated README describes registration in Forma and the floating-panel button configuration.

## Flags

`npx create-forma-extension my-extension` provides the same initializer.
With `npm create`, arguments after `--` are forwarded to the initializer:

```sh
npm create forma-extension@latest my-extension -- --name "My Extension" --yes --no-git
```

| Flag | Behaviour |
| --- | --- |
| `--name <name>` | Sets the display name without a name prompt. |
| `--yes` | Accepts defaults for omitted values without prompts. |
| `--force` | Allows a non-empty directory and overwrites template files; unrelated files and existing Git history remain. |
| `--no-git` | Skips Git initialization. |
| `--help` | Prints usage and exits successfully. |
| `--version` | Prints the initializer version and exits successfully. |

Non-empty directories are refused by default, including directories containing only `.git`.
Symbolic links and incompatible paths at scaffold destinations are refused even with `--force`.
Noninteractive execution requires `--yes` or an explicit directory and `--name`.
Expected errors exit with code 1 and a single-line message; successful commands exit with code 0.

## Generated project

| Path | Contents |
| --- | --- |
| `package.json` | Private ESM package, display name, pinned SDK and development dependencies, development/typecheck/build scripts. |
| `index.html`, `src/` | Native Autodesk controls, responsive panel layouts, proposal and footprint adapters, synthetic preview, loading/empty/error states. |
| `forma/buttons.yaml` | Floating-panel button registration. |
| `tsconfig.json`, `vite.config.ts` | Strict TypeScript and Vite on port 5173. |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Editor, line-ending and Git defaults. |
| `docs/assets/logo.svg`, `README.md` | Original logo, development and registration instructions, upstream MIT notice. |

The generated project contains no upstream GitHub workflows, contribution/security documents, rename script, screenshots or lockfile.
`npm install` creates the project's own lockfile.
The display name is substituted with escaping appropriate to JSON, HTML and Markdown.
The README records the package name and generation year.
The UI reads its name from the HTML title.

The source is [autodesk-forma-extension-template](https://github.com/sharafutdinovdi/autodesk-forma-extension-template).
[forma-zoning-check](https://github.com/sharafutdinovdi/forma-zoning-check) is a full extension with geometry calculations, panel synchronization and overlays.

## Template maintenance

`template/` is a real, checked-in directory bundled with the npm package.
The initializer runs entirely from those files and does not fetch the source repository.

```sh
npm run build
```

The build runs `scripts/sync-template.mjs` against `../autodesk-forma-extension-template`.
The sync is idempotent and fails if that sibling repository or a required source file is missing.
It copies an explicit allowlist, parameterizes names and trims the generated README.
Contributors edit the upstream source and regenerate `template/`; manual changes to the generated directory are overwritten.
Packaging uses the checked-in template and requires no sibling checkout.

The template stores `.gitignore` as `_gitignore`; the initializer restores `.gitignore` in the generated project.
npm excludes `.gitignore` during packing; other dotfiles in `template/` are included explicitly through the package's `files` directory entry.
See [npm's package file rules](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files).

## Licence

[MIT](LICENSE) · Copyright (c) 2026 Dinar Sharafutdinov.
This community initializer is not an Autodesk product.
