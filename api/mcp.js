import { company, processes, listAgents, getAgent, findOpportunities, findAgentsForNeed } from "../lib/core.js";
import { getLibrary } from "../lib/usecases.js";
import { analyzeApp, contextForClient } from "../lib/analyzer.js";
import { searchMcp } from "../lib/mcpregistry.js";
import { syncAgents } from "../lib/store.js";

const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  { name: "analyze_app",
    description: "Analyze an app from its website link, GitHub link, or a description, and recommend AI use cases, existing agents, and real public MCP servers that would improve it.",
    inputSchema: { type: "object", properties: {
      url: { type: "string", description: "App website or GitHub repo link" },
      description: { type: "string", description: "Optional: what the app does and who uses it" } } } },
  { name: "search_public_mcp_servers",
    description: "Search the official public MCP Registry for real, existing MCP servers by keyword (e.g. whatsapp, postgres, calendar). Use this before suggesting building something new.",
    inputSchema: { type: "object", properties: {
      query: { type: "string" }, limit: { type: "number", description: "Max results, default 10" } }, required: ["query"] } },
  { name: "list_use_case_library",
    description: "List all proven AI use cases and registered agents the analyzer can recommend.",
    inputSchema: { type: "object", properties: {} } },
  { name: "list_agents",
    description: "List the AI agents in the registry. Optionally filter by team or location (city).",
    inputSchema: { type: "object", properties: { team: { type: "string" }, location: { type: "string" } } } },
  { name: "get_agent",
    description: "Get full details for one agent by id, including where else it could be reused.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "find_reuse_opportunities",
    description: "Find places where an existing agent could be reused by another team or site.",
    inputSchema: { type: "object", properties: {
      location: { type: "string" }, team: { type: "string" }, agent_id: { type: "string" },
      limit: { type: "number" } } } },
  { name: "find_agents_for_need",
    description: "Describe a business problem in plain words and get existing agents that could help.",
    inputSchema: { type: "object", properties: { need: { type: "string" }, location: { type: "string" } }, required: ["need"] } },
  { name: "list_sites_and_processes",
    description: "List the sites and business processes that are not yet automated.",
    inputSchema: { type: "object", properties: {} } }
];

const text = obj => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });
const fail = msg => ({ ...text(msg), isError: true });

async function callTool(name, args = {}) {
  switch (name) {
    case "analyze_app":
      try {
        return text(process.env.GEMINI_API_KEY ? await analyzeApp(args) : await contextForClient(args));
      } catch (e) { return fail(`Analysis failed: ${e.message}`); }
    case "search_public_mcp_servers":
      try {
        const list = await searchMcp(args.query || "", Math.min(Number(args.limit) || 10, 30));
        return text({ query: args.query, count: list.length, servers: list });
      } catch (e) { return fail(`Registry search failed: ${e.message}`); }
    case "list_use_case_library": return text(getLibrary());
    case "list_agents": return text(listAgents(args));
    case "get_agent": {
      const a = getAgent(args.id);
      return a ? text(a) : fail(`No agent with id "${args.id}". Use list_agents to see valid ids.`);
    }
    case "find_reuse_opportunities":
      return text(findOpportunities({ location: args.location, team: args.team, agentId: args.agent_id, limit: args.limit || 10 }));
    case "find_agents_for_need": return text(findAgentsForNeed(args.need || "", args.location));
    case "list_sites_and_processes": return text({ company, processes });
    default: return null;
  }
}

async function handleMessage(msg) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null) return null;
  const ok = result => ({ jsonrpc: "2.0", id, result });
  const err = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: SUPPORTED.includes(params?.protocolVersion) ? params.protocolVersion : "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "agent-reuse-hub", version: "3.0.0" },
        instructions: "Use analyze_app when the user shares an app link or describes an app and wants ideas to improve it with AI. Use search_public_mcp_servers to find real existing MCP servers before suggesting a new build. Use the registry tools to find and reuse registered agents."
      });
    case "ping": return ok({});
    case "tools/list": return ok({ tools: TOOLS });
    case "tools/call": {
      const r = await callTool(params?.name, params?.arguments || {});
      return r ? ok(r) : err(-32602, `Unknown tool: ${params?.name}`);
    }
    default: return err(-32601, `Method not found: ${method}`);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  await syncAgents();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "This is an MCP endpoint. Connect to it from an MCP client such as Claude." });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body) throw new Error("empty body");
    if (Array.isArray(body)) {
      const replies = (await Promise.all(body.map(handleMessage))).filter(Boolean);
      return replies.length ? res.status(200).json(replies) : res.status(202).end();
    }
    const reply = await handleMessage(body);
    return reply ? res.status(200).json(reply) : res.status(202).end();
  } catch (e) {
    return res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
}
