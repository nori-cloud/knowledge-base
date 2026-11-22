import assert from "node:assert/strict";
import test from "node:test";
import { mountPath, rewriteLink } from "./links.ts";

const context = {
  repo: "nori-cloud/actions",
  ref: "main",
  mount: "projects/actions",
  baseUrl: "/docs",
};

test("leaves absolute, anchor, and root links alone", () => {
  for (const href of [
    "https://x.dev/a",
    "mailto:a@b.c",
    "#top",
    "/docs/x",
    "//cdn/x",
  ]) {
    assert.equal(rewriteLink("guide.md", href, context), undefined);
  }
});

test("turns pages inside docs into site URLs", () => {
  assert.equal(
    rewriteLink("guide.md", "other.md#part", context),
    "/docs/projects/actions/other#part",
  );
  assert.equal(
    rewriteLink("a/b.md", "../c.md", context),
    "/docs/projects/actions/c",
  );
  assert.equal(
    rewriteLink("guide.md", "index.md", context),
    "/docs/projects/actions",
  );
  assert.equal(
    rewriteLink("guide.md", "topic/index.md", context),
    "/docs/projects/actions/topic",
  );
  assert.equal(
    rewriteLink("guide.md", "topic/", context),
    "/docs/projects/actions/topic",
  );
});

test("links to files outside docs go to GitHub", () => {
  assert.equal(
    rewriteLink("guide.md", "../README.md#actions", context),
    "https://github.com/nori-cloud/actions/blob/main/README.md#actions",
  );
  assert.equal(
    rewriteLink("a/guide.md", "../../skills/x/SKILL.md", context),
    "https://github.com/nori-cloud/actions/blob/main/skills/x/SKILL.md",
  );
});

test("non-page files inside docs and images use GitHub URLs", () => {
  assert.equal(
    rewriteLink("guide.md", "meta.json", context),
    "https://github.com/nori-cloud/actions/blob/main/docs/meta.json",
  );
  assert.equal(
    rewriteLink("guide.md", "../img/a.png", context, "image"),
    "https://raw.githubusercontent.com/nori-cloud/actions/main/img/a.png",
  );
});

test("links that escape the repository stay as written", () => {
  assert.equal(
    rewriteLink("guide.md", "../../../etc/passwd", context),
    undefined,
  );
});

test("mounts virtual paths", () => {
  assert.equal(
    mountPath("projects/agents", "skills.md"),
    "projects/agents/skills.md",
  );
  assert.equal(mountPath("", "a.md"), "a.md");
});
