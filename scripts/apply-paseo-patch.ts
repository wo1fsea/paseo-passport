import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "vendor", "paseo");
const expectedBaseline = "15a2e3bdcbefda97587f74e499d6b81a278d458c";
const patches = [
  {
    label: "Paseo Passport host-registry patch",
    path: path.join(repoRoot, "patches", "paseo-web-passport-hosts.patch")
  },
  {
    label: "Paseo Passport Dispatch Dashboard tab patch",
    path: path.join(repoRoot, "patches", "paseo-web-dispatch-dashboard-tab.patch")
  }
];

for (const patch of patches) {
  if (!fs.existsSync(patch.path)) {
    throw new Error(`Missing patch file: ${patch.path}`);
  }
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

for (const patch of patches) {
  applyPatch(patch);
}

function applyPatch(patch: { label: string; path: string }): void {
  const result = spawnSync("git", ["apply", "--check", patch.path], {
    cwd: vendorRoot,
    stdio: "ignore"
  });

  if (result.status === 0) {
    const apply = spawnSync("git", ["apply", patch.path], {
      cwd: vendorRoot,
      stdio: "inherit"
    });

    if (apply.status !== 0) {
      process.exit(apply.status ?? 1);
    }
    return;
  }

  const reverseCheck = spawnSync("git", ["apply", "--reverse", "--check", patch.path], {
    cwd: vendorRoot,
    stdio: "ignore"
  });

  if (reverseCheck.status === 0) {
    console.log(`${patch.label} is already applied.`);
    return;
  }

  spawnSync("git", ["apply", "--check", patch.path], {
    cwd: vendorRoot,
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
}
