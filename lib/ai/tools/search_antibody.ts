import { tool } from 'ai';
import { z } from 'zod';

export const searchAntibody = tool({
  description: 'Search for antibody information based on various parameters',
  parameters: z.object({
    gene_param: z.string().describe('The gene to search for (e.g., "TIMP3")'),
    ab_typo_param: z.string().optional().describe('Antibody type (e.g., "pab" for polyclonal antibody)'),
    ab_app_param: z.string().optional().describe('Antibody application (e.g., "IHC" for immunohistochemistry)'),
    ab_cross_param: z.string().optional().describe('Antibody cross-reactivity (e.g., "RAT")'),
    ab_host_param: z.string().nullable().optional().describe('Antibody host organism')
  }),
  execute: async ({ gene_param, ab_typo_param, ab_app_param, ab_cross_param, ab_host_param }) => {
    const response = await fetch(
      'https://unwlycbkoyvfzhqfyvhk.supabase.co/functions/v1/search_antibody_param',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          gene_param,
          ab_typo_param,
          ab_app_param,
          ab_cross_param,
          ab_host_param
        })
      }
    );
    
    const data = await response.json();
    return data;
  },
});