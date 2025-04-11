import { tool } from 'ai';
import { z } from 'zod';

export const sayHello = tool({
  description: 'Say hello to someone',
  parameters: z.object({
    name: z.string().describe('The name to greet')
  }),
  execute: async ({ name }) => {
    const response = await fetch(
      'https://unwlycbkoyvfzhqfyvhk.supabase.co/functions/v1/hello-name',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ name })
      }
    );
    
    const data = await response.json();
    return data;
  },
});