import { tool } from 'ai';
import { z } from 'zod';

export const searchProduct = tool({
  description: 'Search for a product using search terms',
  parameters: z.object({
    search_term: z.string().describe('The search query for finding products')
  }),
  execute: async ({ search_term }) => {
    const response = await fetch(
      'https://unwlycbkoyvfzhqfyvhk.supabase.co/functions/v1/search_product',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ search_term })
      }
    );
    
    const data = await response.json();
    return data;
  },
});