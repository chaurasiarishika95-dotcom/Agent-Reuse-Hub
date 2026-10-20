import { autofill } from "../lib/autofill.js";
import { getCustom, saveCustom, storeReady } from "../lib/store.js";

const clean = (s, n = 300) => String(s ?? "").trim().slice(0, n);
const okUrl = s => { s = clean(s, 500); return /^https?:\/\//i.test(s) ? s : ""; };
const slug = s => clean(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function normalize(a) {
  const tags = (Array.isArray(a.tags) ? a.tags : String(a.tags || "").split(","))
    .map(slug).filter(Boolean).slice(0, 10);
  return {
    id: /^c-/.test(a.id || "") ? clean(a.id, 80) : `c-${slug(a.name) || "item"}-${Math.random().toString(36).slice(2, 6)}`,
    name: clean(a.name, 80), team: clean(a.team, 60) || "Personal Projects",
    location: clean(a.location, 60) || "Remote", owner: clean(a.owner, 60) || "Me",
    status: clean(a.status, 20) || "Live", description: clean(a.description, 600), tags,
    impact: clean(a.impact, 200),
    hoursSavedPerMonth: Math.max(0, Math.min(100000, Number(a.hoursSavedPerMonth) || 0)),
    builtByMe: a.builtByMe !== false, repo: okUrl(a.repo), demo: okUrl(a.demo),
    updatedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: "ADMIN_PASSWORD is not set in Vercel." });
  if (req.headers["x-admin-password"] !== pass) return res.status(401).json({ error: "Wrong password." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    switch (body.action) {
      case "list":
        return res.status(200).json({ items: await getCustom(), storeReady: storeReady() });
      case "autofill":
        return res.status(200).json({ draft: await autofill({ url: body.url, notes: body.notes }) });
      case "save": {
        const item = normalize(body.item || {});
        if (!item.name || !item.description) return res.status(400).json({ error: "Name and description are required." });
        const list = await getCustom();
        const i = list.findIndex(x => x.id === item.id);
        if (i >= 0) list[i] = item; else list.push(item);
        if (list.length > 200) return res.status(400).json({ error: "Limit of 200 entries reached." });
        await saveCustom(list);
        return res.status(200).json({ item, items: list });
      }
      case "delete": {
        const list = (await getCustom()).filter(x => x.id !== body.id);
        await saveCustom(list);
        return res.status(200).json({ items: list });
      }
      default:
        return res.status(400).json({ error: "Unknown action." });
    }
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Something went wrong." });
  }
}
