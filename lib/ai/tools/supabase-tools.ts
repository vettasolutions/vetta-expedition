import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { DataStreamWriter } from 'ai';
import { Session } from 'next-auth';

export const initSupabaseMCP = ({ 
  session, 
  dataStream 
}: { 
  session: Session;
  dataStream: DataStreamWriter;
}) => {
  return async () => {
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
    
    if (!accessToken) {
      console.error('Supabase access token not found');
      return {};
    }

    // Create the Supabase MCP client
    const transport = new Experimental_StdioMCPTransport({
      command: 'npx',
      args: [
        '-y',
        '@supabase/mcp-server-supabase@latest',
        '--access-token',
        accessToken
      ],
    });

    const client = await experimental_createMCPClient({
      transport,
    });
    
    // Get all available tools from the MCP server
    const supabaseTools = await client.tools();
    
    // This is where we handle cleanup - note we're registering a callback
    // just like in the Next.js docs example
    dataStream.registerCleanupCallback(async () => {
      await client.close();
    });

    return supabaseTools;
  };
};