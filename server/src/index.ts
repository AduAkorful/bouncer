import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { readServerEnv } from "./env.ts";
import { createKeeper } from "./keeper.ts";
import { liveDeps, liveKeeperChain } from "./live.ts";

const parsed = readServerEnv(process.env);
if (!parsed.ok) {
  // Names only. A value never reaches a log.
  console.error(`missing or invalid environment: ${parsed.missing.join(", ")}`);
  process.exit(1);
}
const env = parsed.env;

let statusOf: () => unknown = () => null;
const deps = liveDeps(env, () => statusOf());
const app = createApp(deps);

if (env.keeper) {
  const keeper = createKeeper(liveKeeperChain(env, deps.rpc, deps.post), env.keeper.accountId, Date.now, (line) => console.log(`keeper ${line}`));
  statusOf = keeper.status;
  const run = () => keeper.pass().catch((error) => console.error("keeper pass failed", error instanceof Error ? error.message : "error"));
  void run();
  setInterval(run, 60_000);
}

serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`server listening on ${info.port}`));
