import { redis, storeReady } from "./store.js";

const BASE = "https://registry.modelcontextprotocol.io/v0/servers";
const CAT_KEY = "hub:mcp-catalog";
const TMP_KEY = "hub:mcp-catalog-tmp";
const META_KEY = "hub:mcp-catalog-meta";
const MAX_ENTRIES = 20000;

const safeUrl = u => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : "");

function mapServer(item) {
  const s = item?.server || item || {};
  const off = item?._meta?.["io.modelcontextprotocol.registry/official"];
  if (!s.name) return null;
  if (off && off.isLatest === false) return null;
  if (off && off.status && off.status !== "active") return null;
  const pkg = (s.packages || [])[0];
  const remote = (s.remotes || [])[0];
  return {
    name: s.name, title: s.title || "", description: String(s.description || "").slice(0, 240),
    version: s.version || "", repo: safeUrl(s.repository?.url), website: safeUrl(s.websiteUrl),
    remoteUrl: safeUrl(remote?.url),
    install: pkg ? `${pkg.registryType || pkg.registry_type || "package"}: ${pkg.identifier || pkg.name || ""}` : ""
  };
}

const withLink = s => ({
  ...s, link: s.repo || s.website || `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(s.name)}`
});

async function getJSON(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) { const e = new Error(`MCP Registry returned HTTP ${r.status}`); e.httpStatus = r.status; throw e; }
    return await r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("the MCP Registry took too long to respond");
    throw e;
  } finally { clearTimeout(timer); }
}

// ---------- Local catalog (copied from the official registry) ----------
let MEM = { t: 0, list: null };

async function loadCatalog() {
  if (MEM.list && Date.now() - MEM.t < 10 * 60 * 1000) return MEM.list;
  if (!storeReady()) return null;
  try {
    const raw = await redis(["GET", CAT_KEY]);
    const list = raw ? JSON.parse(raw) : null;
    MEM = { t: Date.now(), list };
    return list;
  } catch { return MEM.list; }
}

export async function catalogStatus() {
  if (!storeReady()) return { count: 0, syncedAt: null, inProgress: false };
  const raw = await redis(["GET", META_KEY]);
  return raw ? JSON.parse(raw) : { count: 0, syncedAt: null, inProgress: false };
}

// Copies the registry in steps that fit within Vercel's time limit
export async function syncCatalogStep({ restart = false, budgetMs = 40000 } = {}) {
  if (!storeReady()) { const e = new Error("Connect the Upstash database first."); e.status = 500; throw e; }
  const start = Date.now();
  let meta = await catalogStatus();
  let cursor = restart || !meta.inProgress ? null : meta.cursor;
  let list = [];
  if (cursor) { const raw = await redis(["GET", TMP_KEY]); list = raw ? JSON.parse(raw) : []; }
  let useVersion = meta.useVersion !== false;
  let done = false, pages = 0;

  while (Date.now() - start < budgetMs) {
    const params = new URLSearchParams({ limit: "100" });
    if (useVersion) params.set("version", "latest");
    if (cursor) params.set("cursor", cursor);
    let j;
    try { j = await getJSON(`${BASE}?${params}`, 15000); }
    catch (e) {
      if (useVersion && e.httpStatus >= 400 && e.httpStatus < 500) { useVersion = false; continue; }
      throw e;
    }
    pages++;
    for (const it of j.servers || []) { const m = mapServer(it); if (m) list.push(m); }
    cursor = j.metadata?.nextCursor || j.metadata?.next_cursor || null;
    if (!cursor || !(j.servers || []).length || list.length >= MAX_ENTRIES) { done = true; break; }
  }

  const byName = new Map();
  for (const s of list) byName.set(s.name, s);
  list = [...byName.values()];

  if (done) {
    await redis(["SET", CAT_KEY, JSON.stringify(list)]);
    await redis(["DEL", TMP_KEY]);
    meta = { count: list.length, syncedAt: new Date().toISOString(), inProgress: false, cursor: null, useVersion };
    MEM = { t: Date.now(), list };
  } else {
    await redis(["SET", TMP_KEY, JSON.stringify(list)]);
    meta = { ...meta, inProgress: true, cursor, useVersion };
  }
  await redis(["SET", META_KEY, JSON.stringify(meta)]);
  return { ...meta, done, pagesThisStep: pages, collected: list.length };
}

function localSearch(cat, q, limit) {
  const terms = q.split(/[\s,_-]+/).filter(t => t.length >= 2);
  if (!terms.length) return [];
  const out = [];
  for (const s of cat) {
    const nm = `${s.name} ${s.title}`.toLowerCase();
    const ds = s.description.toLowerCase();
    let score = 0, ok = true;
    for (const t of terms) {
      if (nm.includes(t)) score += 3;
      else if (ds.includes(t)) score += 1;
      else { ok = false; break; }
    }
    if (ok) out.push([score + (s.repo ? 0.3 : 0) + (s.remoteUrl ? 0.2 : 0), s]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
}

// ---------- Search (local catalog first, live registry as fallback) ----------
const liveCache = new Map();

export async function searchMcp(query, limit = 20) {
  const q = String(query || "").trim().toLowerCase().slice(0, 60);
  if (!q) return [];
  const cat = await loadCatalog();
  if (cat && cat.length) return localSearch(cat, q, limit).map(withLink);

  const key = `${q}|${limit}`;
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.t < 60 * 60 * 1000) return hit.v;
  const j = await getJSON(`${BASE}?search=${encodeURIComponent(q)}&limit=${limit}`, 20000);
  const seen = new Set();
  const v = (j.servers || []).map(mapServer).filter(Boolean)
    .filter(x => !seen.has(x.name) && seen.add(x.name)).map(withLink);
  liveCache.set(key, { t: Date.now(), v });
  return v;
}

export const normKw = arr => (Array.isArray(arr) ? arr : [])
  .map(k => String(k).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, ""))
  .filter(k => k.length >= 3).slice(0, 2);

function rank(list, kws) {
  const best = new Map();
  for (const s of list) {
    const text = `${s.name} ${s.title} ${s.description}`.toLowerCase();
    const score = kws.filter(k => k.split("-").every(p => text.includes(p))).length +
      (s.description ? 0.5 : 0) + (s.repo ? 0.3 : 0) + (s.remoteUrl ? 0.2 : 0);
    const prev = best.get(s.name);
    if (!prev || prev.score < score) best.set(s.name, { ...s, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).map(({ score, ...s }) => s);
}

export async function attachMcpServers(recs, perRec = 3) {
  const all = [...new Set(recs.flatMap(r => r.searchKeywords || []))].slice(0, 12);
  const entries = await Promise.all(all.map(async k => [k, await searchMcp(k, 15).catch(() => [])]));
  const pools = Object.fromEntries(entries);
  for (const r of recs) {
    const kws = r.searchKeywords || [];
    r.mcpServers = rank(kws.flatMap(k => pools[k] || []), kws).slice(0, perRec);
  }
  return recs;
}
