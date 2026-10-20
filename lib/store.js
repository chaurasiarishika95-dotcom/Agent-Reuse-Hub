import { agents, processes, company } from "./core.js";

const SEED_AGENTS = agents.slice();
const SEED_PROCESSES = processes.slice();
const SEED_COMPANY = { ...company };
const KEY = "hub:custom-agents";
const SETTINGS_KEY = "hub:settings";
const DEFAULT_SETTINGS = { demoData: true };
const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeReady = () => Boolean(RURL && RTOKEN);

function requireStore() {
  if (!storeReady()) {
    const e = new Error("Storage isn't connected yet. In Vercel, open Storage, create an Upstash for Redis database, connect it to this project, then redeploy.");
    e.status = 500; throw e;
  }
}

export async function redis(cmd) {
  const r = await fetch(RURL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Database error ${r.status}`);
  return j.result;
}

const parseList = raw => (raw || []).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

// ----- Your entries -----
export async function getCustom() {
  if (!storeReady()) return [];
  const raw = await redis(["GET", KEY]);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}

export async function saveCustom(list) {
  requireStore();
  await redis(["SET", KEY, JSON.stringify(list)]);
}

// ----- Settings (demo data switch) -----
export async function getSettings() {
  if (!storeReady()) return { ...DEFAULT_SETTINGS };
  try {
    const raw = await redis(["GET", SETTINGS_KEY]);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export async function saveSettings(patch) {
  requireStore();
  const next = { ...(await getSettings()), ...patch };
  await redis(["SET", SETTINGS_KEY, JSON.stringify(next)]);
  return next;
}

// Builds the registry for each request: demo data (if on) + your entries
export async function syncAgents() {
  let custom = [], settings = { ...DEFAULT_SETTINGS };
  try { [custom, settings] = await Promise.all([getCustom(), getSettings()]); } catch (e) { console.error(e); }
  agents.length = 0;
  processes.length = 0;
  if (settings.demoData) {
    agents.push(...SEED_AGENTS);
    processes.push(...SEED_PROCESSES);
    Object.assign(company, SEED_COMPANY);
  } else {
    Object.assign(company, {
      name: "Live registry",
      tagline: "Real projects and agents, plus thousands of public MCP servers you can reuse"
    });
  }
  agents.push(...custom);
  return { custom, settings };
}

// ----- Real usage tracking -----
export async function recordAnalysis(entry) {
  if (!storeReady()) return null;
  const id = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await redis(["INCR", "hub:stats:analyses"]);
    await redis(["LPUSH", "hub:analyses", JSON.stringify({ id, ...entry, at: new Date().toISOString() })]);
    await redis(["LTRIM", "hub:analyses", "0", "499"]);
  } catch (e) { console.error(e); }
  return id;
}

export async function recordFeedback(fb) {
  requireStore();
  await redis(["INCR", fb.vote === "up" ? "hub:stats:up" : "hub:stats:down"]);
  await redis(["LPUSH", "hub:feedback", JSON.stringify({ ...fb, at: new Date().toISOString() })]);
  await redis(["LTRIM", "hub:feedback", "0", "999"]);
}

export async function getStats() {
  if (!storeReady()) return { analyses: 0, up: 0, down: 0, usefulPct: null, ready: false };
  const [a, u, d] = await Promise.all(["hub:stats:analyses", "hub:stats:up", "hub:stats:down"].map(k => redis(["GET", k])));
  const up = +u || 0, down = +d || 0;
  return { analyses: +a || 0, up, down, usefulPct: up + down ? Math.round(100 * up / (up + down)) : null, ready: true };
}

export async function recentFeedback(n = 15) {
  if (!storeReady()) return [];
  return parseList(await redis(["LRANGE", "hub:feedback", "0", String(n - 1)]));
}

export async function recentAnalyses(n = 15) {
  if (!storeReady()) return [];
  return parseList(await redis(["LRANGE", "hub:analyses", "0", String(n - 1)]));
}
