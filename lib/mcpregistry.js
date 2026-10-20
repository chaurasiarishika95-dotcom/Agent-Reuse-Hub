const BASE = "https://registry.modelcontextprotocol.io/v0/servers";
const cache = new Map();
const TTL = 60 * 60 * 1000;

const safeUrl = u => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : "");

function mapServer(item) {
  const s = item?.server || item || {};
  if (!s.name) return null;
  const pkg = (s.packages || [])[0];
  const remote = (s.remotes || [])[0];
  const repo = safeUrl(s.repository?.url);
  const website = safeUrl(s.websiteUrl);
  return {
    name: s.name, title: s.title || "", description: s.description || "", version: s.version || "",
    repo, website, remoteUrl: safeUrl(remote?.url),
    install: pkg ? `${pkg.registryType || pkg.registry_type || "package"}: ${pkg.identifier || pkg.name || ""}` : "",
    link: repo || website || `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(s.name)}`
  };
}

export async function searchMcp(query, limit = 20) {
  const q = String(query || "").trim().toLowerCase().slice(0, 60);
  if (!q) return [];
  const key = `${q}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${BASE}?search=${encodeURIComponent(q)}&limit=${limit}`, {
      signal: ctrl.signal, headers: { Accept: "application/json" }
    });
    if (!r.ok) throw new Error(`MCP Registry returned HTTP ${r.status}`);
    const j = await r.json();
    const seen = new Set();
    const v = (j.servers || []).map(mapServer).filter(Boolean)
      .filter(x => !seen.has(x.name) && seen.add(x.name));
    cache.set(key, { t: Date.now(), v });
    return v;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("the MCP Registry took too long to respond");
    throw e;
  } finally { clearTimeout(timer); }
}

export const normKw = arr => (Array.isArray(arr) ? arr : [])
  .map(k => String(k).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, ""))
  .filter(k => k.length >= 3).slice(0, 2);

function rank(list, kws) {
  const best = new Map();
  for (const s of list) {
    const text = `${s.name} ${s.title} ${s.description}`.toLowerCase();
    const score = kws.filter(k => text.includes(k)).length +
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
