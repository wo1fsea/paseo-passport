import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { readCookie } from "../auth/middleware";
import { authenticateSession, SESSION_COOKIE_NAME } from "../auth/sessions";
import type { PassportDatabase } from "../db";

export interface AdminUiOptions {
  adminUser: string;
  db: PassportDatabase;
  localAuthBypass?: boolean;
  sessionSecret: string;
  now?: () => Date;
}

export async function registerAdminUiRoutes(
  server: FastifyInstance,
  options: AdminUiOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());

  server.get("/login", async (_request, reply) => {
    reply.type("text/html").send(renderLoginPage());
  });

  server.get(
    "/admin/machines",
    {
      preHandler: async (request, reply) => {
        if (!isPageAuthenticated(request, options, now())) {
          reply.redirect("/login");
        }
      }
    },
    async (_request, reply) => {
      reply.type("text/html").send(renderMachinesPage());
    }
  );

  server.get(
    "/admin/history",
    {
      preHandler: async (request, reply) => {
        if (!isPageAuthenticated(request, options, now())) {
          reply.redirect("/login");
        }
      }
    },
    async (_request, reply) => {
      reply.type("text/html").send(renderHistoryPage());
    }
  );
}

function isPageAuthenticated(
  request: FastifyRequest,
  options: AdminUiOptions,
  now: Date
): boolean {
  if (options.localAuthBypass) {
    return true;
  }

  const session = authenticateSession({
    db: options.db,
    now,
    sessionSecret: options.sessionSecret,
    token: readCookie(request.headers.cookie, SESSION_COOKIE_NAME)
  });

  return Boolean(session);
}

function renderLoginPage(): string {
  return htmlShell(
    "Paseo Passport Login",
    `
      <main class="auth-shell" data-surface="passport-auth">
        <section class="auth-panel" id="auth-loading">
          <p class="eyebrow">Paseo Passport</p>
          <h1>Checking operator state</h1>
          <p class="muted">Loading authentication status.</p>
        </section>

        <section class="auth-panel" id="enrollment-panel" hidden>
          <div class="panel-heading">
            <p class="eyebrow">First run</p>
            <h1>Paseo Passport</h1>
          </div>
          <div class="segmented" aria-label="Authentication state">
            <span class="segment active">Enroll</span>
            <span class="segment">Login</span>
          </div>
          <div class="qr-panel" aria-label="TOTP QR setup panel">
            <img id="qr-code" class="qr-code" alt="TOTP QR code" />
            <div class="qr-copy">
              <span class="label-text">Manual secret</span>
              <code id="manual-secret" class="manual-secret">Pending</code>
            </div>
          </div>
          <form id="enrollment-form" class="form-stack">
            <label>
              Authentication code
              <input name="totp" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required />
            </label>
            <p id="enrollment-error" class="error" hidden>Enrollment failed.</p>
            <button class="primary" type="submit">Complete enrollment</button>
          </form>
        </section>

        <section class="auth-panel compact" id="login-panel" hidden>
          <div class="panel-heading">
            <p class="eyebrow">Operator login</p>
            <h1>Paseo Passport</h1>
          </div>
          <div class="segmented" aria-label="Authentication state">
            <span class="segment">Enroll</span>
            <span class="segment active">Login</span>
          </div>
          <form id="login-form" class="form-stack">
            <label>
              TOTP code
              <input name="totp" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required />
            </label>
            <p id="login-error" class="error" hidden>Login failed.</p>
            <button class="primary" type="submit">Log in</button>
          </form>
        </section>
      </main>
      <script>
        const loadingPanel = document.getElementById("auth-loading");
        const enrollmentPanel = document.getElementById("enrollment-panel");
        const loginPanel = document.getElementById("login-panel");
        const manualSecret = document.getElementById("manual-secret");
        const qrCode = document.getElementById("qr-code");

        function showPanel(panel) {
          loadingPanel.hidden = panel !== loadingPanel;
          enrollmentPanel.hidden = panel !== enrollmentPanel;
          loginPanel.hidden = panel !== loginPanel;
        }

        function renderQrImage(data) {
          qrCode.src = data.qrImageDataUrl;
          qrCode.dataset.qrPayload = data.qrPayload;
          qrCode.hidden = false;
        }

        async function startEnrollment() {
          const response = await fetch("/api/auth/enrollment/start", {
            method: "POST",
            credentials: "include"
          });
          if (!response.ok) {
            showPanel(loginPanel);
            return;
          }
          const data = await response.json();
          manualSecret.textContent = data.manualSecret;
          renderQrImage(data);
          showPanel(enrollmentPanel);
        }

        async function loadAuthState() {
          const response = await fetch("/api/auth/state", { credentials: "include" });
          const state = await response.json();
          if (state.authenticated) {
            window.location.assign("/admin/machines");
            return;
          }
          if (state.enrolled) {
            showPanel(loginPanel);
            return;
          }
          await startEnrollment();
        }

        document.getElementById("enrollment-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/auth/enrollment/complete", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ totp: form.get("totp") })
          });
          document.getElementById("enrollment-error").hidden = response.ok;
          if (response.ok) {
            window.location.assign("/admin/machines");
          }
        });

        document.getElementById("login-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ totp: form.get("totp") })
          });
          document.getElementById("login-error").hidden = response.ok;
          if (response.ok) {
            window.location.assign("/admin/machines");
          }
        });

        void loadAuthState();
      </script>
    `
  );
}

function renderMachinesPage(): string {
  return htmlShell(
    "Paseo Passport Machines",
    `
      <main class="app-shell" data-surface="passport-app">
        <header class="topbar">
          <div>
            <p class="eyebrow">Registry</p>
            <h1>Machines</h1>
          </div>
          <div class="topbar-actions">
            <a class="button outline" href="/">Open workspace</a>
            <a class="button ghost" href="/admin/history">History</a>
            <button id="logout" class="ghost" type="button">Log out</button>
          </div>
        </header>
        <section class="settings-column">
          <form id="import-form" class="panel form-stack">
            <div class="panel-heading">
              <p class="eyebrow">Pairing</p>
              <h2>Import offer</h2>
            </div>
            <label>
              Label
              <input name="label" required />
            </label>
            <label>
              Pairing offer
              <textarea name="offerUrl" rows="5" required></textarea>
            </label>
            <p id="import-error" class="error" hidden>Import failed.</p>
            <p id="import-status" class="status" aria-live="polite" hidden></p>
            <button class="primary" type="submit">Import</button>
          </form>
          <section class="panel">
            <div class="panel-heading">
              <p class="eyebrow">Active hosts</p>
              <h2>Registry</h2>
            </div>
            <div id="machine-list" class="machine-list" data-empty-label="No machines imported."></div>
          </section>
          <section class="panel">
            <div class="panel-heading">
              <p class="eyebrow">Authentication</p>
              <h2>Reset TOTP enrollment</h2>
            </div>
            <div class="machine-row reset-row">
              <div>
                <strong>Clear current enrollment</strong>
                <span>Requires typing the confirmation phrase before sessions are revoked</span>
              </div>
              <button id="show-reset" class="small outline" type="button">Reset</button>
            </div>
            <form id="reset-confirmation" hidden class="form-stack reset-confirmation">
              <label>
                Type reset-totp-enrollment
                <input id="reset-confirm" name="confirm" autocomplete="off" />
              </label>
              <p id="reset-error" class="error" hidden>Reset failed.</p>
              <button id="reset-button" class="destructive" type="submit" disabled>Reset enrollment</button>
            </form>
          </section>
        </section>
      </main>
      <script>
        const importForm = document.getElementById("import-form");
        const importError = document.getElementById("import-error");
        const importStatus = document.getElementById("import-status");
        const importButton = importForm.querySelector("button[type='submit']");

        function setImportStatus(kind, message) {
          importStatus.dataset.state = kind;
          importStatus.textContent = message;
          importStatus.hidden = message.length === 0;
        }

        async function loadMachines() {
          const response = await fetch("/api/admin/machines", { credentials: "include" });
          if (response.status === 401) {
            window.location.assign("/login");
            return;
          }
          const data = await response.json();
          const list = document.getElementById("machine-list");
          list.replaceChildren();
          if (data.machines.length === 0) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = list.dataset.emptyLabel || "No machines imported.";
            list.append(empty);
            return data;
          }
          for (const machine of data.machines) {
            const row = document.createElement("article");
            row.className = "machine-row";
            const body = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = machine.label;
            const meta = document.createElement("span");
            meta.textContent = machine.serverId + " · " + machine.relayEndpoint;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "small outline";
            button.textContent = "Delete";
            button.addEventListener("click", async () => {
              await fetch("/api/admin/machines/" + encodeURIComponent(machine.id), {
                method: "DELETE",
                credentials: "include"
              });
              await loadMachines();
            });
            body.append(title, meta);
            row.append(body, button);
            list.append(row);
          }
          return data;
        }

        async function refreshMachinesAfterImport(machine) {
          await loadMachines();
          setImportStatus("success", "Imported " + machine.label + ". Active hosts refreshed.");
        }

        importForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          importError.hidden = true;
          setImportStatus("working", "Importing offer.");
          importButton.disabled = true;
          importButton.textContent = "Importing";
          try {
            const response = await fetch("/api/admin/machines/import-offer", {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                label: form.get("label"),
                offerUrl: form.get("offerUrl")
              })
            });
            importError.hidden = response.ok;
            if (response.ok) {
              const data = await response.json();
              event.currentTarget.reset();
              await refreshMachinesAfterImport(data.machine);
            } else {
              setImportStatus("", "");
            }
          } finally {
            importButton.disabled = false;
            importButton.textContent = "Import";
          }
        });

        document.getElementById("logout").addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          window.location.assign("/login");
        });

        const resetConfirm = document.getElementById("reset-confirm");
        const resetButton = document.getElementById("reset-button");
        const resetConfirmation = document.getElementById("reset-confirmation");
        document.getElementById("show-reset").addEventListener("click", () => {
          resetConfirmation.hidden = false;
          resetConfirm.focus();
        });
        resetConfirm.addEventListener("input", () => {
          resetButton.disabled = resetConfirm.value !== "reset-totp-enrollment";
        });
        resetConfirmation.addEventListener("submit", async (event) => {
          event.preventDefault();
          const response = await fetch("/api/auth/enrollment/reset", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ confirm: "reset-totp-enrollment" })
          });
          document.getElementById("reset-error").hidden = response.ok;
          if (response.ok) {
            window.location.assign("/login");
          }
        });

        void loadMachines();
      </script>
    `
  );
}

function renderHistoryPage(): string {
  return htmlShell(
    "Paseo Passport History",
    `
      <main class="app-shell" data-surface="passport-app">
        <header class="topbar">
          <div>
            <p class="eyebrow">Audit</p>
            <h1>History</h1>
          </div>
          <div class="topbar-actions">
            <a class="button outline" href="/admin/machines">Machines</a>
            <a class="button ghost" href="/">Open workspace</a>
          </div>
        </header>
        <section class="grid history-grid">
          <section class="panel">
            <div class="panel-heading">
              <p class="eyebrow">Authentication</p>
              <h2>Access history</h2>
            </div>
            <div id="access-history" class="history-list"></div>
          </section>
          <section class="panel">
            <div class="panel-heading">
              <p class="eyebrow">Workspace</p>
              <h2>Workspace history</h2>
            </div>
            <div id="workspace-history" class="history-list"></div>
          </section>
        </section>
      </main>
      <script>
        function renderEvent(container, event) {
          const row = document.createElement("article");
          row.className = "history-row";
          const title = document.createElement("strong");
          title.textContent = event.eventType;
          const meta = document.createElement("span");
          meta.textContent = [event.occurredAt, event.sourceIp].filter(Boolean).join(" · ");
          row.append(title, meta);
          container.append(row);
        }

        async function loadHistory(endpoint, targetId) {
          const response = await fetch(endpoint, { credentials: "include" });
          if (response.status === 401) {
            window.location.assign("/login");
            return;
          }
          const data = await response.json();
          const target = document.getElementById(targetId);
          target.replaceChildren();
          if (data.events.length === 0) {
            const empty = document.createElement("p");
            empty.className = "muted";
            empty.textContent = "No history yet.";
            target.append(empty);
            return;
          }
          for (const event of data.events) {
            renderEvent(target, event);
          }
        }

        void loadHistory("/api/admin/history/access", "access-history");
        void loadHistory("/api/admin/history/workspace", "workspace-history");
      </script>
    `
  );
}

function htmlShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: dark;
      --surface0: #181B1A;
      --surface1: #1E2120;
      --surface2: #272A29;
      --surface3: #434645;
      --surface4: #595B5B;
      --surface-sidebar: #141716;
      --surface-sidebar-hover: #1c1f1e;
      --foreground: #fafafa;
      --foreground-muted: #A1A5A4;
      --border: #252B2A;
      --border-accent: #2F3534;
      --accent: #20744A;
      --accent-bright: #7ccba0;
      --accent-foreground: #ffffff;
      --destructive: #c64f43;
      --destructive-foreground: #ffffff;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    html { min-height: 100%; background: var(--surface0); }
    body {
      min-height: 100vh;
      margin: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--foreground);
      background: var(--surface0);
      letter-spacing: 0;
    }
    h1, h2, p { margin: 0; }
    h1, h2 { line-height: 1.25; }
    h1 { font-size: 1rem; font-weight: 300; }
    h2 { font-size: 0.875rem; font-weight: 500; }
    button, input, textarea { font: inherit; }
    button, .button {
      min-height: 2.25rem;
      border: 1px solid var(--border-accent);
      background: transparent;
      color: var(--foreground);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 400;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }
    button:hover, .button:hover { background: var(--surface2); }
    button:disabled { cursor: not-allowed; opacity: 0.5; }
    button.primary, .button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-foreground);
    }
    button.primary:hover, .button.primary:hover { background: var(--accent); }
    button.outline, .button.outline { border-color: var(--border-accent); }
    button.ghost, .button.ghost { border-color: transparent; color: var(--foreground-muted); }
    button.destructive {
      background: var(--destructive);
      border-color: var(--destructive);
      color: var(--destructive-foreground);
    }
    button.small { min-height: 2rem; padding: 0.375rem 0.625rem; font-size: 0.8125rem; }
    label { display: grid; gap: 0.375rem; color: var(--foreground-muted); font-size: 0.8125rem; font-weight: 500; }
    input, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.625rem 0.75rem;
      background: var(--surface1);
      color: var(--foreground);
      outline: none;
    }
    input:focus, textarea:focus { border-color: var(--accent); }
    textarea { min-height: 8rem; resize: vertical; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .auth-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .auth-panel {
      width: min(calc(100vw - 2rem), 26rem);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      display: grid;
      gap: 1rem;
      background: var(--surface1);
    }
    .auth-panel.compact { width: min(calc(100vw - 2rem), 22rem); }
    .panel-heading { display: grid; gap: 0.35rem; }
    .eyebrow {
      color: var(--foreground-muted);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .segmented {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      background: var(--surface0);
    }
    .segment {
      padding: 0.5rem 0.625rem;
      color: var(--foreground-muted);
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 400;
    }
    .segment.active { color: var(--foreground); background: var(--surface3); }
    .qr-panel {
      display: grid;
      grid-template-columns: 8.5rem 1fr;
      gap: 1rem;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.9rem;
      background: var(--surface0);
    }
    .qr-code {
      width: 8.5rem;
      aspect-ratio: 1;
      display: block;
      background: #ffffff;
      border-radius: 4px;
    }
    .qr-copy { min-width: 0; display: grid; gap: 0.45rem; }
    .label-text { color: var(--foreground-muted); font-size: 0.75rem; font-weight: 500; }
    .manual-secret { color: var(--foreground); overflow-wrap: anywhere; line-height: 1.5; }
    .form-stack { display: grid; gap: 0.9rem; }
    .app-shell { max-width: 760px; margin: 0 auto; padding: 1.5rem; }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .topbar-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: minmax(18rem, 24rem) 1fr; gap: 1rem; align-items: start; }
    .settings-column { display: grid; gap: 1rem; }
    .content-stack { display: grid; gap: 1rem; }
    .panel {
      background: var(--surface1);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }
    .machine-list, .history-list { display: grid; }
    .machine-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.9rem;
      padding: 0.875rem 0;
      border-top: 1px solid var(--border);
    }
    .machine-row:first-child { border-top: 0; padding-top: 0; }
    .machine-row div { min-width: 0; display: grid; gap: 0.25rem; }
    .machine-row strong, .history-row strong { color: var(--foreground); font-weight: 400; overflow-wrap: anywhere; }
    .reset-row { padding-bottom: 0; }
    .reset-confirmation { border-top: 1px solid var(--border); padding-top: 1rem; }
    .history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .history-row {
      display: grid;
      gap: 0.25rem;
      padding: 0.875rem 0;
      border-top: 1px solid var(--border);
    }
    .history-row:first-child { border-top: 0; padding-top: 0; }
    .machine-row span, .history-row span, .muted { color: var(--foreground-muted); overflow-wrap: anywhere; }
    .error { color: var(--destructive); font-size: 0.75rem; font-weight: 400; }
    .status { color: var(--foreground-muted); font-size: 0.75rem; font-weight: 400; }
    .status[data-state="success"] { color: var(--accent-bright); }
    .status[data-state="working"] { color: var(--foreground-muted); }
    @media (max-width: 760px) {
      .app-shell { padding: 1rem; }
      .auth-panel.compact { width: min(calc(100vw - 2rem), 17rem); }
      .grid, .history-grid { grid-template-columns: 1fr; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .topbar-actions { width: 100%; }
      .topbar-actions > * { flex: 1 1 auto; }
      .qr-panel { grid-template-columns: 1fr; }
      .qr-code { width: min(100%, 11rem); justify-self: center; }
      .machine-row { align-items: flex-start; flex-direction: column; }
      .machine-row button { width: 100%; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}
