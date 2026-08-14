import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import type { SubagentSnapshot } from "../domain.ts";
import {
  BRIDGE_DIRECTORY,
  BRIDGE_VERSION,
  encodeMessage,
  parseLines,
  type BridgeManifest,
  type ServerMessage,
} from "../protocol.ts";

export interface BridgeClient {
  snapshots(): ReadonlyArray<SubagentSnapshot>;
  connected(): boolean;
  ready(): boolean;
  subscribe(listener: () => void): () => void;
  steer(id: string, text: string): void;
  abort(id: string): void;
  close(): void;
}

function manifests() {
  if (!fs.existsSync(BRIDGE_DIRECTORY)) return [];
  return fs
    .readdirSync(BRIDGE_DIRECTORY)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(BRIDGE_DIRECTORY, file))
    .flatMap((file) => {
      try {
        const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as BridgeManifest;
        return manifest.version === BRIDGE_VERSION ? [manifest] : [];
      } catch {
        return [];
      }
    });
}

export function createBridgeClient(): BridgeClient {
  const listeners = new Set<() => void>();
  const sockets = new Map<string, net.Socket>();
  const states = new Map<string, ReadonlyArray<SubagentSnapshot>>();
  const fingerprints = new Map<string, string>();
  const authenticated = new Set<string>();
  let closed = false;

  const notify = () => {
    for (const listener of listeners) listener();
  };
  const updateState = (
    socketPath: string,
    snapshots: ReadonlyArray<SubagentSnapshot>,
  ) => {
    const fingerprint = JSON.stringify(snapshots);
    if (fingerprints.get(socketPath) === fingerprint) return;
    fingerprints.set(socketPath, fingerprint);
    states.set(socketPath, snapshots);
    notify();
  };
  const connect = (manifest: BridgeManifest) => {
    if (closed || sockets.has(manifest.socket)) return;
    const socket = net.createConnection(manifest.socket);
    sockets.set(manifest.socket, socket);
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("connect", () => {
      authenticated.add(manifest.socket);
      socket.write(encodeMessage({ type: "auth", token: manifest.token }));
      notify();
    });
    socket.on("data", (chunk) => {
      buffer = parseLines(String(chunk), buffer, (raw) => {
        const message = raw as ServerMessage;
        if (message.type !== "state" || !Array.isArray(message.snapshots)) return;
        updateState(manifest.socket, message.snapshots);
      });
    });
    const disconnected = () => {
      sockets.delete(manifest.socket);
      authenticated.delete(manifest.socket);
      notify();
    };
    socket.on("close", disconnected);
    socket.on("error", () => undefined);
  };
  const discover = () => {
    for (const manifest of manifests()) connect(manifest);
  };
  discover();
  const discoveryTimer = setInterval(discover, 1_000);

  const allSnapshots = () => {
    const unique = new Map<string, SubagentSnapshot>();
    for (const snapshots of states.values()) {
      for (const snapshot of snapshots) unique.set(snapshot.id, snapshot);
    }
    return [...unique.values()];
  };
  const sendToOwner = (id: string, message: Parameters<typeof encodeMessage>[0]) => {
    for (const [socketPath, snapshots] of states) {
      if (!snapshots.some((snapshot) => snapshot.id === id)) continue;
      sockets.get(socketPath)?.write(encodeMessage(message));
      return;
    }
  };

  return {
    snapshots: allSnapshots,
    connected: () => authenticated.size > 0,
    ready: () => states.size > 0,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    steer: (id, text) => sendToOwner(id, { type: "steer", id, text }),
    abort: (id) => sendToOwner(id, { type: "abort", id }),
    close: () => {
      closed = true;
      clearInterval(discoveryTimer);
      listeners.clear();
      for (const socket of sockets.values()) socket.destroy();
      sockets.clear();
      states.clear();
      fingerprints.clear();
      authenticated.clear();
    },
  };
}
