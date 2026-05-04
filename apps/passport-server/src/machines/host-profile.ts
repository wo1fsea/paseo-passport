import type { MachineRecord } from "../db";

export interface RelayHostConnection {
  id: string;
  type: "relay";
  relayEndpoint: string;
  daemonPublicKeyB64: string;
}

export interface HostProfile {
  serverId: string;
  label: string;
  lifecycle: Record<string, never>;
  connections: RelayHostConnection[];
  preferredConnectionId: string;
  createdAt: string;
  updatedAt: string;
}

export function machineToHostProfile(machine: MachineRecord): HostProfile {
  const connectionId = `relay:${machine.relayEndpoint}`;

  return {
    serverId: machine.serverId,
    label: machine.label,
    lifecycle: {},
    connections: [
      {
        id: connectionId,
        type: "relay",
        relayEndpoint: machine.relayEndpoint,
        daemonPublicKeyB64: machine.daemonPublicKeyB64
      }
    ],
    preferredConnectionId: connectionId,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString()
  };
}
