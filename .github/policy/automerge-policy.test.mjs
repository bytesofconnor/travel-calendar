import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decideArm, decideDeploy } from "./automerge-policy.mjs";

const repo = "bytesofconnor/travel-calendar";
const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("same repo, not draft, policy on base arms", () => {
  assert.deepEqual(
    decideArm({
      headRepo: repo,
      baseRepo: repo,
      draft: false,
      policyOnBase: true,
    }),
    { action: "arm" },
  );
});

test("fork skips arm", () => {
  assert.deepEqual(
    decideArm({
      headRepo: "other/travel-calendar",
      baseRepo: repo,
      draft: false,
      policyOnBase: true,
    }),
    { action: "skip" },
  );
});

test("empty head repo skips arm", () => {
  assert.deepEqual(
    decideArm({
      headRepo: "",
      baseRepo: repo,
      draft: false,
      policyOnBase: true,
    }),
    { action: "skip" },
  );
});

test("draft skips arm", () => {
  assert.deepEqual(
    decideArm({
      headRepo: repo,
      baseRepo: repo,
      draft: true,
      policyOnBase: true,
    }),
    { action: "skip" },
  );
});

test("policy absent on base skips arm", () => {
  assert.deepEqual(
    decideArm({
      headRepo: repo,
      baseRepo: repo,
      draft: false,
      policyOnBase: false,
    }),
    { action: "skip" },
  );
});

test("fork origin skips deploy", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "fork",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

test("ci-failed origin skips deploy", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "ci-failed",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

test("not-pull-request origin skips deploy", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "not-pull-request",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

test("same-repo pull request on main that is not merged waits", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: false,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "wait" },
  );
});

test("same-repo pull request on a feature branch that is not merged skips", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "feature",
      merged: false,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

test("github-actions squash on main that touches convex/ deploys that sha", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "deploy", ref: sha },
  );
});

test("github-actions squash on main with no convex/ file skips", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["README.md"],
    }),
    { action: "skip" },
  );
});

test("github-actions squash on main that only changes root convex.json skips", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex.json"],
    }),
    { action: "skip" },
  );
});

test("github-actions squash onto a branch other than main skips", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "feature",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

test("squash by someone other than github-actions skips", () => {
  assert.deepEqual(
    decideDeploy({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: true,
      mergedBy: "other",
      mergeSha: sha,
      files: ["convex/schema.ts"],
    }),
    { action: "skip" },
  );
});

const script = fileURLToPath(new URL("./automerge-policy.mjs", import.meta.url));

function runCli(args, input) {
  return spawnSync(process.execPath, [script, ...args], {
    input,
    encoding: "utf8",
  });
}

test("arm CLI prints one JSON verdict and nothing else", () => {
  const result = runCli(
    ["arm"],
    JSON.stringify({
      headRepo: repo,
      baseRepo: repo,
      draft: false,
      policyOnBase: true,
    }),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '{"action":"arm"}\n');
  assert.equal(result.stderr, "");
});

test("deploy CLI prints one JSON verdict and nothing else", () => {
  const result = runCli(
    ["deploy"],
    JSON.stringify({
      origin: "same-repo-pr",
      baseRef: "main",
      merged: true,
      mergedBy: "github-actions",
      mergeSha: sha,
      files: ["convex.json"],
    }),
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '{"action":"skip"}\n');
  assert.equal(result.stderr, "");
});

test("invalid JSON exits 2 with an empty stdout", () => {
  const result = runCli(["arm"], "{");
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.notEqual(result.stderr, "");
});

test("unknown command exits 2 with an empty stdout", () => {
  const result = runCli(["nope"], "{}");
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.notEqual(result.stderr, "");
});
