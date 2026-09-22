import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "../autodesk-forma-extension-template");
const target = join(root, "template");
const copied = ["index.html", "src", "forma/buttons.yaml", "tsconfig.json", "vite.config.ts", ".editorconfig", ".gitattributes", ".gitignore", "docs/assets/logo.svg"];

function section(content, start, end) {
  const first = content.indexOf(start);
  const last = end ? content.indexOf(end, first + start.length) : content.length;
  if (first < 0 || last < 0) throw new Error(`Source README marker is missing: ${start} / ${end}.`);
  return content.slice(first, last).trim();
}

async function tokenize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await tokenize(file);
    else if (/\.(ts|js|css|html)$/.test(file)) {
      const content = await readFile(file, "utf8");
      await writeFile(file, content.replaceAll("Forma extension", "__DISPLAY_NAME__").replaceAll("autodesk-forma-extension-template", "__PACKAGE_NAME__"));
    }
  }
}

try {
  for (const file of [...copied, "package.json", "README.md", "LICENSE"]) {
    try {
      await stat(join(source, file));
    } catch {
      throw new Error(`Template source is missing or unreadable: ${join(source, file)}. Clone autodesk-forma-extension-template beside this repository.`);
    }
  }
  const pkg = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  pkg.name = "__PACKAGE_NAME__";
  pkg.displayName = "__DISPLAY_NAME__";
  const upstreamReadme = await readFile(join(source, "README.md"), "utf8");
  const license = await readFile(join(source, "LICENSE"), "utf8");
  const intro = section(upstreamReadme, '<p align="center">', "[![CI]")
    .replace("# Autodesk Forma extension template", "# __DISPLAY_NAME__");
  const setup = section(upstreamReadme, "The app runs at", "## Register it in Forma");
  const registration = section(upstreamReadme, "## Register it in Forma", '<img src="docs/screens/');
  const contents = section(upstreamReadme, "## What you get", "The default metric")
    .replace("Vite, strict TypeScript and a lockfile.", "Vite and strict TypeScript.")
    .replace(/^- A clean-tree rename script.*\n?/m, "");
  const readme = `${intro}\n\nPackage: \`__PACKAGE_NAME__\`.\nGenerated in __YEAR__ with [create-forma-extension](https://github.com/sharafutdinovdi/create-forma-extension).\n\n## Development\n\nRequires Node.js 20 or later.\n\n\`\`\`sh\nnpm install\nnpm run dev\n\`\`\`\n\n${setup}\n\n\`\`\`sh\nnpm run typecheck\nnpm run build\n\`\`\`\n\nThe production bundle is written to \`dist/\`.\n\n${registration}\n\n${contents}\n\nThe footprint adapter returns a set union of polygon parts; overlapping parts are not dissolved boundaries and their areas must not be summed.\nThe SDK uses proposal APIs deprecated in favour of UDM.\nFixture checks do not verify registration or live geometry; verify both panel placements in a Forma project before shipping.\n\n## References\n\nBased on [autodesk-forma-extension-template](https://github.com/sharafutdinovdi/autodesk-forma-extension-template).\nSee [forma-zoning-check](https://github.com/sharafutdinovdi/forma-zoning-check) for a full extension with geometry calculations, cross-panel synchronization and overlays.\n\n## Licence\n\nThe starter code and original logo retain the upstream MIT licence below.\nThis community project is not an Autodesk product.\n\n${license}`;
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const file of copied) {
    await mkdir(join(target, file, ".."), { recursive: true });
    await cp(join(source, file), join(target, file), { recursive: true });
  }
  await rename(join(target, ".gitignore"), join(target, "_gitignore"));
  await tokenize(target);
  await writeFile(join(target, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  await writeFile(join(target, "README.md"), readme);
  console.log(`Synced template from ${source}.`);
} catch (error) {
  console.error(`Error: ${String(error.message ?? error).replace(/[\r\n]+/g, " ")}`);
  process.exitCode = 1;
}
