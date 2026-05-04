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
      <main class="auth-shell">
        <form id="login-form" class="panel">
          <h1>Paseo Passport</h1>
          <label>
            Username
            <input name="username" autocomplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <label>
            TOTP
            <input name="totp" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required />
          </label>
          <p id="login-error" class="error" hidden>Login failed.</p>
          <button type="submit">Log in</button>
        </form>
      </main>
      <script>
        document.getElementById("login-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              username: form.get("username"),
              password: form.get("password"),
              totp: form.get("totp")
            })
          });
          document.getElementById("login-error").hidden = response.ok;
          if (response.ok) {
            window.location.assign("/admin/machines");
          }
        });
      </script>
    `
  );
}

function renderMachinesPage(): string {
  return htmlShell(
    "Paseo Passport Machines",
    `
      <main class="app-shell">
        <header class="topbar">
          <h1>Machines</h1>
          <div class="topbar-actions">
            <a class="button" href="/">Open Workspace</a>
            <button id="logout" type="button">Log out</button>
          </div>
        </header>
        <section class="grid">
          <form id="import-form" class="panel">
            <h2>Import Offer</h2>
            <label>
              Label
              <input name="label" required />
            </label>
            <label>
              Pairing Offer
              <textarea name="offerUrl" rows="5" required></textarea>
            </label>
            <p id="import-error" class="error" hidden>Import failed.</p>
            <button type="submit">Import</button>
          </form>
          <section class="panel">
            <h2>Registry</h2>
            <div id="machine-list" class="machine-list"></div>
          </section>
        </section>
      </main>
      <script>
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
            empty.textContent = "No machines imported.";
            list.append(empty);
            return;
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
        }

        document.getElementById("import-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/admin/machines/import-offer", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              label: form.get("label"),
              offerUrl: form.get("offerUrl")
            })
          });
          document.getElementById("import-error").hidden = response.ok;
          if (response.ok) {
            event.currentTarget.reset();
            await loadMachines();
          }
        });

        document.getElementById("logout").addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          window.location.assign("/login");
        });

        void loadMachines();
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
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18211f; background: #f5f6f3; }
    h1, h2 { margin: 0; line-height: 1.1; }
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.1rem; }
    button, input, textarea { font: inherit; }
    button, .button { border: 0; background: #155a4a; color: white; padding: 0.7rem 1rem; border-radius: 6px; cursor: pointer; text-decoration: none; }
    button:hover, .button:hover { background: #0e473a; }
    label { display: grid; gap: 0.4rem; font-weight: 650; }
    input, textarea { box-sizing: border-box; width: 100%; border: 1px solid #cbd4ce; border-radius: 6px; padding: 0.65rem 0.75rem; background: white; }
    textarea { resize: vertical; }
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 1rem; }
    .app-shell { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    .topbar-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: minmax(18rem, 24rem) 1fr; gap: 1rem; align-items: start; }
    .panel { background: white; border: 1px solid #dde3df; border-radius: 8px; padding: 1rem; display: grid; gap: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .machine-list { display: grid; gap: 0.75rem; }
    .machine-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 1px solid #e2e7e4; border-radius: 6px; padding: 0.8rem; }
    .machine-row div { min-width: 0; display: grid; gap: 0.25rem; }
    .machine-row span, .muted { color: #65736e; overflow-wrap: anywhere; }
    .error { margin: 0; color: #a12828; font-weight: 650; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } .topbar { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}
