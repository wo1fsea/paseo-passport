const LOCAL_HOSTS_STORAGE_KEY = "@paseo:daemon-registry";

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
