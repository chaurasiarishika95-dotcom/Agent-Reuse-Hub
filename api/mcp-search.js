import { searchMcp } from "../lib/mcpregistry.js";

export default async function handler(req, res) {
  const q = String(req.query?.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Type at least 2 characters." });
  try {
    const servers = await searchMcp(q, 30);
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json({ query: q, count: servers.length, servers });
  } catch (e) {
    return res.status(502).json({ error: `Couldn't reach the MCP Registry: ${e.message}` });
  }
}
