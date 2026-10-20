import { company, agents, processes, findOpportunities } from "../lib/core.js";
import { syncAgents } from "../lib/store.js";

export default async function handler(req, res) {
  await syncAgents();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ company, agents, processes, opportunities: findOpportunities({ limit: 100 }) });
}
