import { analyzeApp } from "../lib/analyzer.js";
import { syncAgents, recordAnalysis } from "../lib/store.js";

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600000);
  if (recent.length >= 10) { hits.set(ip, recent); return true; }
  recent.push(now); hits.set(ip, recent);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "You've run 10 analyses this hour. Please try again later." });
  try {
    await syncAgents();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const result = await analyzeApp({ url: body.url, description: body.description });
    result.analysisId = await recordAnalysis({
      url: result.input.url, title: result.appProfile?.name || result.input.title || "",
      sourceType: result.input.sourceType, recommendations: result.recommendations.length
    });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Something went wrong." });
  }
}
