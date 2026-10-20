# Agent Reuse Hub — upgraded version

This archive contains the original project with the MCP Registry integration, recommendation feedback, usage statistics, and demo-data switch upgrade applied.

## New files
- `lib/mcpregistry.js`
- `api/feedback.js`
- `api/stats.js`
- `api/mcp-search.js`

## Replaced files
- `lib/store.js`
- `lib/analyzer.js`
- `api/data.js`
- `api/analyze.js`
- `api/admin.js`
- `api/mcp.js`
- `index.html`
- `registry.html`
- `admin.html`

## Unchanged from the previous version
- `package.json`
- `vercel.json`
- `lib/core.js`
- `lib/usecases.js`
- `lib/autofill.js`

Keep your existing Vercel environment variables (`GEMINI_API_KEY`, `ADMIN_PASSWORD`) and Upstash Redis connection. No new API key is required for the public MCP Registry.
