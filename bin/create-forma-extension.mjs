#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cp, lstat, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const templateRoot = join(packageRoot, "template");
const usage = `Usage: npm create forma-extension@latest [dir] [-- options]
       npx create-forma-extension [dir] [options]

Create an Autodesk Forma extension. Requires Node.js 20 or later.

Options:
  --name <name>  Display name (package name is its ASCII slug)
  --yes          Accept defaults without prompting
  --force        Overwrite template files in a non-empty directory
  --no-git       Skip git initialization
  --help         Print this help
  --version      Print the initializer version

Default directory: forma-extension
--force preserves unrelated files and existing git history.
`;

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") continue;
    if (["--yes", "--force", "--no-git", "--help", "--version"].includes(arg)) {
      options[arg.slice(2)] = true;
    } else if (arg === "--name" || arg.startsWith("--name=")) {
      const value = arg === "--name" ? args[++index] : arg.slice(7);
      if (!value || value.startsWith("--")) throw new Error("--name requires a display name.");
      options.name = value;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}. Use --help for usage.`);
    } else if (options.dir !== undefined) {
      throw new Error("Only one target directory is allowed.");
    } else {
      options.dir = arg;
    }
  }
  return options;
}

async function statIfExists(file) {
  try {
    return await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function displayNameFor(directory) {
  return basename(directory).replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function slugFor(name) {
  const slug = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug || slug.length > 214 || ["node_modules", "favicon.ico"].includes(slug)) {
    throw new Error("The display name must produce a package name of 1–214 ASCII letters, digits or hyphens.");
  }
  return slug;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function substitute(content, values) {
  return content.replace(/__(DISPLAY_NAME|PACKAGE_NAME|YEAR)__/g, (_, key) => values[key]);
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else if (entry.isFile()) files.push(file);
    else throw new Error(`Template contains an unsupported entry: ${file}.`);
  }
  return files;
}

async function checkDestination(file, directory, target) {
  const parent = dirname(file);
  if (file !== target) await checkDestination(parent, true, target);
  const stat = await statIfExists(file);
  if (stat && (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()))) {
    throw new Error(`Cannot overwrite a symbolic link or incompatible path: ${file}.`);
  }
}

let readline;

async function prompt(label, fallback) {
  if (!process.stdin.isTTY) throw new Error("Interactive input requires a terminal; use --yes or provide a directory and --name.");
  if (!readline) readline = createInterface({ input: process.stdin, output: process.stdout });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  readline.once("SIGINT", cancel);
  readline.once("close", cancel);
  try {
    return (await readline.question(`${label} (${fallback}): `, { signal: controller.signal })).trim() || fallback;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Cancelled.");
    throw error;
  } finally {
    readline.off("SIGINT", cancel);
    readline.off("close", cancel);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return process.stdout.write(usage);
  if (options.version) {
    const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    return console.log(pkg.version);
  }
  const directory = options.dir ?? (options.yes ? "forma-extension" : await prompt("Project directory", "forma-extension"));
  if (!directory.trim() || /[\x00-\x1f\x7f]/.test(directory)) throw new Error("Provide a non-empty directory without control characters.");
  const target = resolve(directory);
  if (packageRoot.startsWith(target + sep) || target === resolve(packageRoot) || target.startsWith(templateRoot + sep) || target === templateRoot) {
    throw new Error("The target directory must not overwrite the initializer or its template.");
  }
  await checkDestination(target, true, target);
  const stat = await statIfExists(target);
  if (stat && (await readdir(target)).length && !options.force) {
    throw new Error(`Directory is not empty: ${directory}. Use --force to overwrite template files.`);
  }
  const fallbackName = displayNameFor(target);
  const name = (options.name ?? (options.yes ? fallbackName : await prompt("Display name", fallbackName))).trim();
  readline?.close();
  if (!name || /[\x00-\x1f\x7f]/.test(name)) throw new Error("The display name must not be empty or contain control characters.");
  const values = { DISPLAY_NAME: name, PACKAGE_NAME: slugFor(name), YEAR: String(new Date().getFullYear()) };
  const files = await filesUnder(templateRoot);
  for (const file of files) {
    const local = relative(templateRoot, file);
    await checkDestination(join(target, local === "_gitignore" ? ".gitignore" : local), false, target);
  }
  await checkDestination(join(target, "_gitignore"), false, target);
  if (await statIfExists(join(target, "_gitignore"))) throw new Error("The target contains a reserved _gitignore file; move it before scaffolding.");
  if (!options["no-git"]) {
    try {
      execFileSync("git", ["--version"], { stdio: "ignore" });
    } catch {
      throw new Error("Git is unavailable; install Git or use --no-git.");
    }
  }
  await mkdir(target, { recursive: true });
  await cp(templateRoot, target, { recursive: true, force: true });
  await rename(join(target, "_gitignore"), join(target, ".gitignore"));
  for (const file of files) {
    const local = relative(templateRoot, file);
    if (!["package.json", "index.html", "README.md"].includes(local) && !local.startsWith(`src${sep}`)) continue;
    const destination = join(target, local);
    const content = await readFile(destination, "utf8");
    let escapedName = name;
    if (local === "package.json") escapedName = JSON.stringify(name).slice(1, -1);
    else if (local.endsWith(".html")) escapedName = escapeHtml(name);
    else if (local === "README.md") escapedName = escapeHtml(name).replace(/[\\`*_{}\[\]()#+.!|~-]/g, "\\$&");
    else if (/\.[cm]?[jt]sx?$/.test(local)) escapedName = JSON.stringify(name).slice(1, -1).replace(/['`$]/g, "\\$&");
    await writeFile(destination, substitute(content, { ...values, DISPLAY_NAME: escapedName }));
  }
  if (!options["no-git"]) {
    try {
      execFileSync("git", ["init", "--quiet"], { cwd: target, stdio: "pipe" });
    } catch {
      throw new Error(`Project created at ${directory}, but git init failed; run git init there manually.`);
    }
  }
  const cdTarget = /^[a-zA-Z0-9_./-]+$/.test(directory) ? directory : `'${directory.replaceAll("'", "'\\''")}'`;
  console.log(`Created ${name} in ${directory}.

Next steps:
  cd ${cdTarget}
  npm install
  npm run dev

Fixture: http://localhost:5173/?fixture=1
Forma: Create an extension, allowlist your project, set RIGHT_MENU_ANALYSIS_PANEL to http://localhost:5173/, paste forma/buttons.yaml into Buttons, then save and add it to the project (see README.md).`);
}

try {
  await main();
} catch (error) {
  console.error(`Error: ${String(error.message ?? error).replace(/[\r\n\x00-\x1f\x7f]+/g, " ")}`);
  process.exitCode = 1;
} finally {
  readline?.close();
}
