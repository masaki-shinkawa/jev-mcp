import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JevClient } from './jev-client.js';
import { jevDecideInputSchema } from './schemas.js';

export function createServer(client = new JevClient()): McpServer {
  const server = new McpServer({ name: 'jev-mcp', version: '1.0.0' });
  server.registerTool('jev_decide', {
    description: 'Ask Jev to choose among the supplied options using the provided context and question.',
    inputSchema: jevDecideInputSchema,
  }, async (input) => {
    try {
      const result = await client.decide(input);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The Jev decision request failed.';
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  });
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Failed to start Jev MCP server.');
    process.exitCode = 1;
  });
}
