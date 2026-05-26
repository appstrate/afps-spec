// Minimal MCP server payload for the fetch_json tool.
//
// This is an illustrative entry point referenced by the MCPB manifest
// (server.entry_point). A real server would speak the Model Context
// Protocol over stdio using an MCP SDK; this stub keeps the example
// self-contained and dependency-free.

import { createServer } from "node:http";

/** The single tool this server exposes. */
const tools = [
  {
    name: "fetch_json",
    description: "Fetch JSON from a URL and return the parsed response.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "HTTP or HTTPS URL" },
      },
      required: ["url"],
    },
  },
];

/** Execute the fetch_json tool. */
async function fetchJson({ url }) {
  const response = await fetch(url);
  const data = await response.json();
  return JSON.stringify(data, null, 2);
}

const handlers = { fetch_json: fetchJson };

const server = createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const { tool, args } = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  const handler = handlers[tool];
  if (!handler) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `unknown tool: ${tool}` }));
    return;
  }
  try {
    const text = await handler(args ?? {});
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ content: [{ type: "text", text }] }));
  } catch (err) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ isError: true, content: [{ type: "text", text: String(err) }] }));
  }
});

if (process.env.MCP_SERVER_LIST_TOOLS) {
  process.stdout.write(JSON.stringify({ tools }) + "\n");
} else {
  const port = Number(process.env.PORT ?? 0);
  server.listen(port);
}
