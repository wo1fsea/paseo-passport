import { z } from "zod";

export interface ParsedRelayOffer {
  serverId: string;
  relayEndpoint: string;
  daemonPublicKeyB64: string;
}

const RelayOfferSchema = z.object({
  v: z.literal(2),
  serverId: z.string().min(1),
  daemonPublicKeyB64: z.string().min(1),
  relay: z.object({
    endpoint: z.string().min(1)
  })
});

export function parseRelayOffer(value: string): ParsedRelayOffer {
  const encoded = extractOfferFragment(value);
  const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  const offer = RelayOfferSchema.parse(decoded);

  return {
    serverId: offer.serverId,
    relayEndpoint: offer.relay.endpoint,
    daemonPublicKeyB64: offer.daemonPublicKeyB64
  };
}

function extractOfferFragment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Offer is required.");
  }

  const hash = extractHash(trimmed);
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const offer = params.get("offer");

  if (!offer) {
    throw new Error("Offer fragment is missing.");
  }

  return offer;
}

function extractHash(value: string): string {
  if (value.startsWith("#")) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.hash;
  } catch {
    return value;
  }
}
