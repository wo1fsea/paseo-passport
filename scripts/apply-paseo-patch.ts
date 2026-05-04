import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "vendor", "paseo");
const patchPath = path.join(repoRoot, "patches", "paseo-web-passport-hosts.patch");
const expectedBaseline = "4338f5b46ca3f562c907fb5c4d8df31d7b485a72";

if (!fs.existsSync(patchPath)) {
  throw new Error(`Missing patch file: ${patchPath}`);
}

if (!fs.existsSync(path.join(vendorRoot, ".git"))) {
  console.log("vendor/paseo is not present; see docs/upstream-paseo.md for clone instructions.");
  process.exit(0);
}

const baseline = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: vendorRoot,
  encoding: "utf8"
});
if (baseline.status !== 0) {
  process.exit(baseline.status ?? 1);
}
const actualBaseline = baseline.stdout.trim();
if (actualBaseline !== expectedBaseline) {
  console.log(
    `vendor/paseo is at ${actualBaseline}; patch baseline is ${expectedBaseline}. ` +
      "See docs/upstream-paseo.md before applying."
  );
  process.exit(1);
}

const result = spawnSync("git", ["apply", "--check", patchPath], {
  cwd: vendorRoot,
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const apply = spawnSync("git", ["apply", patchPath], {
  cwd: vendorRoot,
  stdio: "inherit"
});

process.exit(apply.status ?? 1);
