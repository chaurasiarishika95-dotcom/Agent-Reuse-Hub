import { agents } from "./core.js";

const SEED = agents.slice();
const KEY = "hub:custom-agents";
const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeReady = () => Boolean(RURL && RTOKEN);

async function redis(cmd) {
  const r = await fetch(RURL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Database error ${r.status}`);
  return j.result;
}

export async function getCustom() {
  if (!storeReady()) return [];
  const raw = await redis(["GET", KEY]);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

export async function saveCustom(list) {
  if (!storeReady()) {
    const e = new Error("Storage isn't connected yet. In Vercel, open Storage, create an Upstash for Redis database, connect it to this project, then redeploy.");
    e.status = 500; throw e;
  }
  await redis(["SET", KEY, JSON.stringify(list)]);
}

// Merges your saved entries into the registry for every request
export async function syncAgents() {
  let custom = [];
  try { custom = await getCustom(); } catch (e) { console.error(e); }
  agents.length = 0;
  agents.push(...SEED, ...custom);
  return custom;
}
