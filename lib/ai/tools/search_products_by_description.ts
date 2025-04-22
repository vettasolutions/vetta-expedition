import { tool } from 'ai';
import { z } from 'zod';

export const searchProductsByDescription = tool({
  description: 'Search for a product using the product description',
  parameters: z.object({
    query_text: z.string().describe('The search query for finding products')
  }),
  execute: async ({ query_text }) => {
    const response = await fetch(
      'https://unwlycbkoyvfzhqfyvhk.supabase.co/functions/v1/search_product_by_description',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ query_text })
      }
    );
    
    const data = await response.json();
    return data;
  },
});