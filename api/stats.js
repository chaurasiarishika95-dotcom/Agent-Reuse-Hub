import { getStats } from "../lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try { return res.status(200).json(await getStats()); }
  catch { return res.status(200).json({ analyses: 0, up: 0, down: 0, usefulPct: null, ready: false }); }
}
