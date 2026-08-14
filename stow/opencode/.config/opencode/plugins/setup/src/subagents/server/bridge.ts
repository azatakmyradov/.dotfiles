import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import type { SubagentManagerShape } from "../manager.ts";
import {
  BRIDGE_DIRECTORY,
  BRIDGE_VERSION,
  encodeMessage,
  parseLines,
  type BridgeManifest,
  type ClientMessage,
} from "../protocol.ts";

export async function createServerBridge(manager: SubagentManagerShape) {
  fs.mkdirSync(BRIDGE_DIRECTORY, { recursive: true, mode: 0o700 });
  fs.chmodSync(BRIDGE_DIRECTORY, 0o700);
  const suffix = randomBytes(6).toString("hex");
  const socketPath = path.join(BRIDGE_DIRECTORY, `s-${process.pid}-${suffix}.sock`);
  const manifestPath = path.join(BRIDGE_DIRECTORY, `s-${process.pid}-${suffix}.json`);
  const token = randomBytes(32).toString("hex");
  const sockets = new Set<net.Socket>();

  const sendState = (socket: net.Socket) => {
    socket.write(encodeMessage({ type: "state", snapshots: manager.view.list() }));
  };
  const broadcast = () => {
    for (const socket of sockets) sendState(socket);
  };

  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let authenticated = false;
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer = parseLines(String(chunk), buffer, (raw) => {
        const message = raw as Partial<ClientMessage>;
        if (!authenticated) {
          if (message.type !== "auth" || message.token !== token) {
            socket.destroy();
            return;
          }
          authenticated = true;
          sockets.add(socket);
          sendState(socket);
          return;
        }
        if (message.type === "abort" && typeof message.id === "string") {
          manager.view.requestAbort(message.id);
        } else if (
          message.type === "steer" &&
          typeof message.id === "string" &&
          typeof message.text === "string" &&
          message.text.trim()
        ) {
          manager.view.requestSend(message.id, message.text);
        }
      });
    });
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });
  fs.chmodSync(socketPath, 0o600);
  const manifest: BridgeManifest = {
    version: BRIDGE_VERSION,
    socket: socketPath,
    token,
    pid: process.pid,
    startedAt: Date.now(),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });
  const unsubscribe = manager.view.subscribe(broadcast);

  return async () => {
    unsubscribe();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(socketPath, { force: true });
    fs.rmSync(manifestPath, { force: true });
  };
}
