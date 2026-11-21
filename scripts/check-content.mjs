import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { remark } from "remark";

const root = resolve("content/docs");
const publicRoot = resolve("public");
const files = readdirSync(root, { recursive: true })
  .filter((file) => /\.(md|mdx)$/.test(file))
  .map((file) => join(root, file));
const processor = remark();
const normalize = (path) => path.replace(/\/$/, "") || "/";
const pageUrl = (file) =>
  normalize(
    `/docs/${relative(root, file)
      .split(sep)
      .join("/")
      .replace(/\.(md|mdx)$/, "")
      .replace(/(^|\/)index$/, "")}`,
  );
const routes = new Set(["/", ...files.map(pageUrl)]);
const errors = [];
let checked = 0;

function checkLink(file, href) {
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(href))
    return;
  checked++;
  const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
  if (!pathname) return;
  if (!pathname.startsWith("/") && /\.(md|mdx)$/.test(pathname)) {
    if (files.includes(resolve(dirname(file), pathname))) return;
  } else {
    const url = new URL(href, `https://docs.example${pageUrl(file)}`).pathname;
    if (routes.has(normalize(url))) return;
    if (routes.has(normalize(url.replace(/\.(md|txt)$/, "")))) return;
    const asset = resolve(publicRoot, `.${url}`);
    if (asset.startsWith(`${publicRoot}${sep}`) && existsSync(asset)) return;
  }
  errors.push(`${relative(root, file)}: unresolved internal link ${href}`);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  // Frontmatter isn't part of the Markdown body and can contain Markdown examples.
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  const tree = processor.parse(body);
  const definitions = new Map();
  function visit(node, callback) {
    callback(node);
    for (const child of node.children ?? []) visit(child, callback);
  }
  visit(tree, (node) => {
    if (node.type === "definition") definitions.set(node.identifier, node.url);
  });
  visit(tree, (node) => {
    if (node.type === "link" || node.type === "image")
      checkLink(file, node.url);
    if (node.type === "linkReference" || node.type === "imageReference") {
      const href = definitions.get(node.identifier);
      if (href) checkLink(file, href);
      else
        errors.push(
          `${relative(root, file)}: undefined reference ${node.identifier}`,
        );
    }
    if (node.type === "html") {
      for (const match of node.value.matchAll(
        /\b(?:href|src)=["']([^"']+)["']/g,
      )) {
        checkLink(file, match[1]);
      }
    }
  });
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${files.length} documents and ${checked} internal links.`,
  );
}
