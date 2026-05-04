import type { FastifyInstance } from "fastify";
import { createAuthMiddleware } from "../auth/middleware";
import type { PassportDatabase } from "../db";
import { machineToHostProfile } from "./host-profile";
import { parseRelayOffer } from "./offer";

export interface MachineRoutesOptions {
  adminUser: string;
  db: PassportDatabase;
  localAuthBypass?: boolean;
  sessionSecret: string;
  now?: () => Date;
}

interface ImportOfferBody {
  label: string;
  offerUrl: string;
}

export async function registerMachineRoutes(
  server: FastifyInstance,
  options: MachineRoutesOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const requireAuth = createAuthMiddleware({
    adminUser: options.adminUser,
    db: options.db,
    localAuthBypass: options.localAuthBypass,
    now,
    sessionSecret: options.sessionSecret
  });

  server.post(
    "/api/admin/machines/import-offer",
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = parseImportBody(request.body);
      if (!body) {
        reply.code(400).send({ error: "invalid_offer" });
        return;
      }

      try {
        const parsed = parseRelayOffer(body.offerUrl);
        const machine = options.db.upsertMachine({
          label: body.label,
          serverId: parsed.serverId,
          relayEndpoint: parsed.relayEndpoint,
          daemonPublicKeyB64: parsed.daemonPublicKeyB64,
          now: now()
        });

        reply.code(201).send({ machine: serializeMachine(machine) });
      } catch {
        reply.code(400).send({ error: "invalid_offer" });
      }
    }
  );

  server.get("/api/admin/machines", { preHandler: requireAuth }, async () => {
    return {
      machines: options.db.listActiveMachines().map(serializeMachine)
    };
  });

  server.delete("/api/admin/machines/:id", { preHandler: requireAuth }, async (request, reply) => {
    const id = String((request.params as { id?: string }).id ?? "");
    const deleted = options.db.deleteMachine(id, now());

    if (!deleted) {
      reply.code(404).send({ error: "not_found" });
      return;
    }

    reply.code(204).send();
  });

  server.get("/api/passport/hosts", { preHandler: requireAuth }, async () => {
    return options.db.listActiveMachines().map(machineToHostProfile);
  });
}

function parseImportBody(value: unknown): ImportOfferBody | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof ImportOfferBody, unknown>>;
  if (
    typeof candidate.label !== "string" ||
    candidate.label.trim() === "" ||
    typeof candidate.offerUrl !== "string" ||
    candidate.offerUrl.trim() === ""
  ) {
    return null;
  }

  return {
    label: candidate.label.trim(),
    offerUrl: candidate.offerUrl
  };
}

function serializeMachine(machine: {
  id: string;
  label: string;
  serverId: string;
  relayEndpoint: string;
  daemonPublicKeyB64: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: machine.id,
    label: machine.label,
    serverId: machine.serverId,
    relayEndpoint: machine.relayEndpoint,
    daemonPublicKeyB64: machine.daemonPublicKeyB64,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString()
  };
}
