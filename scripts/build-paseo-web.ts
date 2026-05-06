import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const repoRoot = path.resolve(__dirname, "..");
const upstreamDir = path.join(repoRoot, "vendor", "paseo");
const upstreamDistDir = path.join(upstreamDir, "packages", "app", "dist");
const outputDir = path.join(repoRoot, "apps", "passport-server", "public");
const patchScript = path.join(repoRoot, "scripts", "apply-paseo-patch.ts");
const expectedCommit = "15a2e3bdcbefda97587f74e499d6b81a278d458c";
const expectedTag = "v0.1.67";

verifyUpstreamPin();
applyPassportPatch();

runUpstreamBuild();

if (!fs.existsSync(path.join(upstreamDistDir, "index.html"))) {
  throw new Error(`Upstream Paseo build did not produce ${path.relative(repoRoot, path.join(upstreamDistDir, "index.html"))}.`);
}

fs.rmSync(outputDir, {
  recursive: true,
  force: true
});
fs.mkdirSync(outputDir, {
  recursive: true
});
fs.cpSync(upstreamDistDir, outputDir, {
  recursive: true
});
fs.copyFileSync(path.join(upstreamDir, "LICENSE"), path.join(outputDir, "upstream-paseo-LICENSE.txt"));

console.log(`Built upstream Paseo web app from ${expectedTag} (${expectedCommit}) into ${path.relative(repoRoot, outputDir)}`);

function verifyUpstreamPin(): void {
  if (!fs.existsSync(upstreamDir)) {
    throw new Error("Missing vendor/paseo submodule. Initialize it before building Paseo web.");
  }

  const commit = execGit(["rev-parse", "HEAD"]);
  const tag = execGit(["describe", "--tags", "--exact-match", "HEAD"]);

  if (commit !== expectedCommit || tag !== expectedTag) {
    throw new Error(`vendor/paseo must be pinned to ${expectedTag} / ${expectedCommit}; found ${tag || "no exact tag"} / ${commit}.`);
  }
}

function execGit(args: string[]): string {
  return execFileSync("git", ["-C", upstreamDir, ...args], {
    encoding: "utf8"
  }).trim();
}

function runUpstreamBuild(): void {
  const result = spawnSync("npm", ["run", "build", "--workspace=@getpaseo/app"], {
    cwd: upstreamDir,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Upstream Paseo web build failed.");
  }
}

function applyPassportPatch(): void {
  const result = spawnSync("npx", ["tsx", patchScript], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Failed to apply Paseo Passport upstream patches.");
  }
}
