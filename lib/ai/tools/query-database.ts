// lib/ai/tools/query-database.ts
import { tool } from 'ai';
import { z } from 'zod';

// Define the filter schema
const filterSchema = z.object({
  field: z.string().describe('The database field to filter on'),
  operator: z.enum(['eq', 'gt', 'lt', 'like']).describe('The comparison operator to use'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('The value to compare against')
});

export const queryDatabase = tool({
  description: 'Query the Supabase database for information',
  parameters: z.object({
    table: z.string().describe('The database table to query'),
    select: z.string().optional().describe('The columns to select (comma-separated), defaults to all (*)'),
    filters: z.array(filterSchema).optional().describe('Filters to apply to the query'),
    limit: z.number().optional().describe('Maximum number of results to return, defaults to 10')
  }),
  execute: async ({ table, select, filters, limit }) => {
    try {
      const response = await fetch(
        'https://YOUR_PROJECT_REF.functions.supabase.co/query-database',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            table,
            select,
            filters,
            limit
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error querying database: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Database query error: ${result.error}`);
      }
      
      return result.data;
    } catch (error) {
      console.error('Error in queryDatabase tool:', error);
      throw error;
    }
  },
});