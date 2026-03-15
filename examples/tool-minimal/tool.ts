// Tool implementation for fetch_json
// How this file is loaded and executed depends on the runtime.
// See the AFPS specification §3.4 for details.

export default function register(runtime: any) {
  runtime.registerTool({
    name: "fetch_json",
    description: "Fetch JSON from a URL and return the parsed response.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "HTTP or HTTPS URL" }
      },
      required: ["url"]
    },
    async execute(params: { url: string }) {
      const response = await fetch(params.url);
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
  });
}
