import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig } from "./config.ts";

test("uses defaults without requiring secrets", () => {
  const config = parseConfig({});
  assert.equal(config.SOURCE_REFRESH_INTERVAL_MS, 600_000);
  assert.equal(config.DEEPSEEK_MODEL, "deepseek-v4-flash");
  assert.equal(config.DEEPSEEK_API_KEY, undefined);
  assert.equal(config.GITHUB_TOKEN, undefined);
  assert.equal(config.MCP_ENABLED, false);
});

test("accepts configured values", () => {
  const config = parseConfig({
    SOURCE_REFRESH_INTERVAL_MS: "30000",
    DEEPSEEK_API_KEY: "test-key",
    DEEPSEEK_MODEL: "custom-model",
    GITHUB_TOKEN: "test-token",
    MCP_ENABLED: "true",
  });
  assert.equal(config.SOURCE_REFRESH_INTERVAL_MS, 30_000);
  assert.equal(config.DEEPSEEK_MODEL, "custom-model");
  assert.equal(config.DEEPSEEK_API_KEY, "test-key");
  assert.equal(config.GITHUB_TOKEN, "test-token");
  assert.equal(config.MCP_ENABLED, true);
});

test("rejects invalid MCP settings", () => {
  assert.throws(() => parseConfig({ MCP_ENABLED: "yes" }));
});

test("rejects invalid refresh intervals", () => {
  for (const value of ["", "0", "-1", "1.5", "abc", "9007199254740992"]) {
    assert.throws(() => parseConfig({ SOURCE_REFRESH_INTERVAL_MS: value }));
  }
});

test("rejects empty configured secrets and model", () => {
  for (const key of ["DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "GITHUB_TOKEN"]) {
    assert.throws(() => parseConfig({ [key]: "" }));
  }
});
