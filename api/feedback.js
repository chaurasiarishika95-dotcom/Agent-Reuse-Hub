import { recordFeedback, storeReady } from "../lib/store.js";

const clean = (s, n) => String(s ?? "").trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!storeReady()) return res.status(503).json({ error: "Feedback storage isn't connected." });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const vote = b.vote === "up" ? "up" : b.vote === "down" ? "down" : null;
    if (!vote) return res.status(400).json({ error: "Vote must be up or down." });
    await recordFeedback({
      vote, analysisId: clean(b.analysisId, 60), title: clean(b.title, 160),
      type: clean(b.type, 30), app: clean(b.app, 160)
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Couldn't save feedback." });
  }
}
