import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), "kb-source-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function check(root) {
  return spawnSync(process.execPath, ["scripts/check-source-docs.mjs", root], {
    encoding: "utf8",
  });
}

const page = (title, body = "Hi.") =>
  `---\ntitle: ${title}\ndescription: d\n---\n\n${body}\n`;

test("accepts a conforming docs folder", () => {
  const result = check(
    repo({
      "README.md": "# r\n",
      "docs/index.md": page("Home", "[guide](guide.md) [readme](../README.md)"),
      "docs/guide.md": page("Guide"),
      "docs/meta.json": '{"title":"Home"}',
    }),
  );
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, files, message] of [
  ["missing docs folder", { "README.md": "# r\n" }, "missing docs/"],
  ["missing index", { "docs/a.md": page("A") }, "docs/index.md"],
  ["missing title", { "docs/index.md": "# x\n" }, "needs a title"],
  ["mdx page", { "docs/index.md": page("A"), "docs/b.mdx": "x" }, "only .md"],
  [
    "broken link",
    { "docs/index.md": page("A", "[x](gone.md)") },
    "unresolved link",
  ],
  ["root link", { "docs/index.md": page("A", "[x](/guide)") }, "root-relative"],
  ["raw html", { "docs/index.md": page("A", "<b>x</b>") }, "raw HTML"],
]) {
  test(`rejects ${name}`, () => {
    const result = check(repo(files));
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(message));
  });
}
