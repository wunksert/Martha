import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from './prisma.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { logEndpoint } from './lib/helpers.js';
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Create an MCP server
const server = new McpServer({
  name: 'prisma-mcp-server',
  version: '1.0.0',
},
{
    capabilities: {
        resources: {
            subscribe: true,
            listChanged: true 
        }
    },
    instructions: "Discover products from your favorite brand. Add todos to your to-do list."
}
);

// Register tools, resources, and prompts
registerTools(server);
registerResources(server);
registerPrompts(server);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

app.use(cors({
    origin: "*", //allow all origins
    credentials: false 
}))
// Serve static UI files from Vite build output
app.use('/ui', express.static(join(__dirname, '../dist/ui')));


// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    logEndpoint('GET', '/health', startTime, res.statusCode);
  } catch (error) {
    logEndpoint('GET', '/health', startTime, res.statusCode, error as Error);
    throw error;
  }
});

// MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  const startTime = Date.now();
  logEndpoint('POST', '/mcp', startTime, res.statusCode);
//   server.server.sendResourceUpdated({uri: "ui://widget/todo.html"})
  try {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    logEndpoint('POST', '/mcp', startTime, res.statusCode);
  } catch (error) {
    logEndpoint('POST', '/mcp', startTime, res.statusCode, error as Error);
    throw error;
  }
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, async () => {
  console.log(`MCP Server running on http://localhost:${port}/mcp`);
  
  // Test Prisma connection
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}).on('error', error => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

