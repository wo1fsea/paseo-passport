import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "apps", "passport-server", "public");

fs.mkdirSync(outputDir, {
  recursive: true
});

fs.writeFileSync(
  path.join(outputDir, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paseo Passport Workspace</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17211e; background: #f4f6f5; }
    main { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0; font-size: 1.7rem; }
    button { border: 0; border-radius: 6px; padding: 0.7rem 1rem; color: white; background: #155a4a; cursor: pointer; }
    .panel { background: white; border: 1px solid #dde4e0; border-radius: 8px; padding: 1rem; }
    .summary { margin: 0 0 1rem; }
    .hosts { display: grid; gap: 0.75rem; }
    .host { border: 1px solid #e1e7e3; border-radius: 6px; padding: 0.8rem; display: grid; gap: 0.25rem; }
    .muted { color: #64736d; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Paseo Passport Workspace</h1>
      <button id="logout" type="button">Log out</button>
    </header>
    <section class="panel">
      <p id="summary" class="summary muted">Loading host registry...</p>
      <div id="hosts" class="hosts"><p class="muted">Loading hosts...</p></div>
    </section>
  </main>
  <script src="/passport-hosts.js"></script>
</body>
</html>
`,
  "utf8"
);

fs.writeFileSync(
  path.join(outputDir, "passport-hosts.js"),
  `const LOCAL_HOSTS_STORAGE_KEY = "@paseo:daemon-registry";

function readLocalHosts() {
  const stored = window.localStorage.getItem(LOCAL_HOSTS_STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadPassportHosts() {
  const response = await fetch("/api/passport/hosts", { credentials: "include" });
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error("Unable to load Passport hosts.");
  }
  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed : [];
}

function mergeHosts(localHosts, passportHosts) {
  const hostsByServerId = new Map();
  for (const host of [...localHosts, ...passportHosts]) {
    if (host && typeof host.serverId === "string") {
      hostsByServerId.set(host.serverId, host);
    }
  }
  return Array.from(hostsByServerId.values());
}

function renderHosts(hosts, localCount, passportCount) {
  const container = document.getElementById("hosts");
  const summary = document.getElementById("summary");
  container.replaceChildren();
  summary.textContent = localCount + " local host(s), " + passportCount + " Passport host(s).";
  if (hosts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No hosts available.";
    container.append(empty);
    return;
  }
  for (const host of hosts) {
    const row = document.createElement("article");
    row.className = "host";
    const title = document.createElement("strong");
    title.textContent = host.label;
    const meta = document.createElement("span");
    meta.className = "muted";
    meta.textContent = host.serverId + " · " + (host.preferredConnectionId || "no preferred connection");
    row.append(title, meta);
    container.append(row);
  }
}

async function bootWorkspaceShell() {
  const localHosts = readLocalHosts();
  const passportHosts = await loadPassportHosts();
  renderHosts(mergeHosts(localHosts, passportHosts), localHosts.length, passportHosts.length);
}

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.assign("/login");
});

void bootWorkspaceShell();
`,
  "utf8"
);

console.log(`Built Passport workspace shell at ${path.relative(repoRoot, outputDir)}`);
