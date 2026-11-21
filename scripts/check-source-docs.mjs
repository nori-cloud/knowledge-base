// Validates a source repository's docs/ folder against the Knowledge Base convention.
// Usage: node scripts/check-source-docs.mjs <repository-path>
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { remark } from "remark";

const repo = resolve(process.argv[2] ?? ".");
const docsRoot = join(repo, "docs");
const errors = [];
const warnings = [];

if (!existsSync(docsRoot) || !statSync(docsRoot).isDirectory()) {
  console.error(`${repo}: missing docs/ folder`);
  process.exit(1);
}

const entries = readdirSync(docsRoot, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));
const pages = entries.filter((file) => file.endsWith(".md"));
const rel = (file) => relative(repo, file).split(sep).join("/");

for (const file of entries) {
  if (file.endsWith(".md")) continue;
  if (file.endsWith(`${sep}meta.json`)) {
    try {
      JSON.parse(readFileSync(file, "utf8"));
    } catch {
      errors.push(`${rel(file)}: invalid JSON`);
    }
    continue;
  }
  errors.push(`${rel(file)}: only .md pages and meta.json are published`);
}

if (!existsSync(join(docsRoot, "index.md"))) {
  errors.push("docs/index.md: required landing page is missing");
}

const processor = remark();
const pageSet = new Set(pages);

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? match[1] : undefined;
}

function field(block, name) {
  const match = block?.match(new RegExp(`^${name}:[ \\t]*(.+)$`, "m"));
  return match?.[1].trim().replace(/^["']|["']$/g, "");
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function checkLink(file, href) {
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(href))
    return;
  if (href.startsWith("/")) {
    errors.push(
      `${rel(file)}: root-relative link ${href} is ambiguous; use a relative path`,
    );
    return;
  }
  const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
  const target = resolve(dirname(file), pathname);
  if (!target.startsWith(`${repo}${sep}`)) {
    errors.push(`${rel(file)}: link ${href} leaves the repository`);
  } else if (target.startsWith(`${docsRoot}${sep}`)) {
    const candidates = [target, `${target}.md`, join(target, "index.md")];
    if (!candidates.some((candidate) => pageSet.has(candidate))) {
      errors.push(`${rel(file)}: unresolved link ${href}`);
    }
  } else if (!existsSync(target)) {
    errors.push(`${rel(file)}: link ${href} points to a missing file`);
  }
}

for (const file of pages) {
  const text = readFileSync(file, "utf8");
  const block = frontmatter(text);
  if (!field(block, "title"))
    errors.push(`${rel(file)}: frontmatter needs a title`);
  if (!field(block, "description"))
    warnings.push(`${rel(file)}: description is recommended`);
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  const tree = processor.parse(body);
  const definitions = new Map();
  visit(tree, (node) => {
    if (node.type === "definition") definitions.set(node.identifier, node.url);
  });
  visit(tree, (node) => {
    if (node.type === "link" || node.type === "image")
      checkLink(file, node.url);
    if (node.type === "linkReference" || node.type === "imageReference") {
      const href = definitions.get(node.identifier);
      if (href) checkLink(file, href);
    }
    if (node.type === "html") {
      errors.push(`${rel(file)}: raw HTML is not rendered; use Markdown`);
    }
  });
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${rel(docsRoot)}: ${pages.length} pages OK`);
