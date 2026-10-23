import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ORIGINS = new Set(["same-repo-pr", "fork", "not-pull-request", "ci-failed"]);
const MERGED_BY = new Set(["github-actions", "other"]);

export function decideArm(facts) {
  if (facts.headRepo === "" || facts.headRepo !== facts.baseRepo || facts.draft || !facts.policyOnBase) {
    return { action: "skip" };
  }
  return { action: "arm" };
}

export function decideDeploy(facts) {
  if (facts.origin !== "same-repo-pr" || facts.baseRef !== "main") {
    return { action: "skip" };
  }
  if (!facts.merged) {
    return { action: "wait" };
  }
  if (facts.mergedBy !== "github-actions") {
    return { action: "skip" };
  }
  if (!facts.files.some((file) => file.startsWith("convex/"))) {
    return { action: "skip" };
  }
  return { action: "deploy", ref: facts.mergeSha };
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(obj, key) {
  if (typeof obj[key] !== "string") fail(`${key} must be a string`);
  return obj[key];
}

function booleanField(obj, key) {
  if (typeof obj[key] !== "boolean") fail(`${key} must be a boolean`);
  return obj[key];
}

function parseArm(raw) {
  if (!isObject(raw)) fail("facts must be an object");
  return {
    headRepo: stringField(raw, "headRepo"),
    baseRepo: stringField(raw, "baseRepo"),
    draft: booleanField(raw, "draft"),
    policyOnBase: booleanField(raw, "policyOnBase"),
  };
}

function parseDeploy(raw) {
  if (!isObject(raw)) fail("facts must be an object");
  const origin = stringField(raw, "origin");
  if (!ORIGINS.has(origin)) fail("origin is not a known value");
  const mergedBy = stringField(raw, "mergedBy");
  if (!MERGED_BY.has(mergedBy)) fail("mergedBy is not a known value");
  if (!Array.isArray(raw.files) || raw.files.some((file) => typeof file !== "string")) {
    fail("files must be an array of strings");
  }
  return {
    origin,
    baseRef: stringField(raw, "baseRef"),
    merged: booleanField(raw, "merged"),
    mergedBy,
    mergeSha: stringField(raw, "mergeSha"),
    files: raw.files,
  };
}

function readFacts() {
  let text;
  try {
    text = readFileSync(0, "utf8");
  } catch {
    fail("could not read stdin");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("invalid JSON");
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  const command = process.argv[2];
  if (command !== "arm" && command !== "deploy") {
    fail("usage: automerge-policy.mjs arm|deploy");
  }
  const raw = readFacts();
  const verdict = command === "arm" ? decideArm(parseArm(raw)) : decideDeploy(parseDeploy(raw));
  process.stdout.write(`${JSON.stringify(verdict)}\n`);
}
