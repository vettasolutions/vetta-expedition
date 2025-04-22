import { z } from 'zod';
import { createSupabaseTool } from './supabase-utils/tool-factory';

/**
 * Search for a product using search terms
 */
export const searchProduct = createSupabaseTool({
  description: 'Search for a product using search terms',
  functionPath: 'search_product',
  parameters: z.object({
    search_term: z.string().describe('The search query for finding products')
  })
});

/**
 * Search for a product using product description
 */
export const searchProductsByDescription = createSupabaseTool({
  description: 'Search for a product using the product description',
  functionPath: 'search_product_by_description',
  parameters: z.object({
    query_text: z.string().describe('The search query for finding products')
  })
});

/**
 * Search for antibody information based on various parameters
 */
export const searchAntibody = createSupabaseTool({
  description: 'Search for antibody information based on various parameters',
  functionPath: 'search_antibody_param',
  parameters: z.object({
    gene_param: z.string().describe('The gene to search for (e.g., "TIMP3")'),
    ab_typo_param: z.string().optional().describe('Antibody type (e.g., "pab" for polyclonal antibody)'),
    ab_app_param: z.string().optional().describe('Antibody application (e.g., "IHC" for immunohistochemistry)'),
    ab_cross_param: z.string().optional().describe('Antibody cross-reactivity (e.g., "RAT")'),
    ab_host_param: z.string().nullable().optional().describe('Antibody host organism')
  })
}); 