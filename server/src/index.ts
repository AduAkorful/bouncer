import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { readServerEnv } from "./env.ts";
import { createKeeper } from "./keeper.ts";
import { liveDeps, liveKeeperChain } from "./live.ts";
import { readSurrealEnv } from "./player-db.ts";
import { createKeyWatch, type KeySlot } from "./key-scope.ts";
import { createRelayWatch } from "./relay-watch.ts";

const parsed = readServerEnv(process.env);
if (!parsed.ok) {
  // Names only. A value never reaches a log.
  console.error(`missing or invalid environment: ${parsed.missing.join(", ")}`);
  process.exit(1);
}
const surreal = readSurrealEnv(process.env);
if (!surreal.ok) {
  console.error(`missing or invalid environment: ${surreal.missing.join(", ")}`);
  process.exit(1);
}
const env = parsed.env;

const relayWatch = createRelayWatch(env.relay.rpcUrl, env.relay.accountId, (line) => console.log(`relay ${line}`));
// Plan 73: the verdict key and the keeper's key are read back from the chain and used only while they are scoped.
const vault = env.relay.contractId;
const slots: KeySlot[] = [{ name: "verdict", accountId: env.relay.accountId, privateKey: env.relay.verdictKey, expect: { receiver: vault, methods: ["submit_verdict"] } }];
if (env.keeper) slots.push({ name: "keeper", accountId: env.keeper.accountId, privateKey: env.keeper.privateKey, expect: { receiver: vault, methods: ["close_round", "commit_round"] } });
const keys = createKeyWatch(env.relay.rpcUrl, slots, env.keyAllowanceYocto, (line) => console.log(`keys ${line}`));
const firstKeyCheck = keys.check();

let statusOf: () => unknown = () => null;
const deps = liveDeps(env, () => ({ keeper: statusOf(), relay: relayWatch.state(), keys: keys.state() }), () => keys.ready("verdict"));
const app = createApp(deps);

if (env.keeper) {
  const keeper = createKeeper(liveKeeperChain(env, deps.rpc, deps.post), env.keeper.accountId, Date.now, (line) => console.log(`keeper ${line}`));
  statusOf = keeper.status;
  const run = () => {
    if (!keys.ready("keeper")) return;
    return keeper.pass().catch((error) => console.error("keeper pass failed", error instanceof Error ? error.message : "error"));
  };
  void firstKeyCheck.then(run);
  setInterval(run, 60_000);
}

setInterval(() => void keys.check(), 10 * 60_000);
void relayWatch.check();
setInterval(() => void relayWatch.check(), 5 * 60_000);

serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`server listening on ${info.port}`));
