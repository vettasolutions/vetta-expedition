import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Mentors/Social Workers -> 1. Similar Needs Finder

const findSimilarFamiliesByNeedsParams = z.object({
  reference_family_id: z
    .number()
    .int()
    .positive()
    .describe('The family_id of the family to compare against.'),
  indicator_code_names: z
    .array(z.string())
    .optional()
    .describe(
      "Optional: Specific indicator code names (e.g., ['income', 'housing']) to focus the similarity search on.",
    ),
  limit: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe('Maximum number of similar families to return.'),
});

export const findSimilarFamiliesByNeedsTool = tool({
  description:
    'Finds families assigned to the requesting mentor with similar red indicators to a specified reference family, based on latest snapshots.',
  parameters: findSimilarFamiliesByNeedsParams,
  execute: async (params: z.infer<typeof findSimilarFamiliesByNeedsParams>) => {
    const { reference_family_id, indicator_code_names, limit } = params;

    try {
      console.log(
        `Executing findSimilarFamiliesByNeedsTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-find-similar-families-by-needs`
        '/api/placeholder-psp-find-similar-families-by-needs', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceFamilyId: reference_family_id,
            indicatorCodeNames: indicator_code_names,
            limit: limit,
            // Requesting mentor's user ID needs to be passed implicitly/securely
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          'Error response from backend:',
          response.status,
          errorBody,
        );
        throw new Error(
          `Backend request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const data = await response.json();
      console.log('Received data from backend:', data);
      // Example expected return: { familyId: number; familyCode: string; similarityScore: number; commonRedIndicators: string[] }[]
      return data;
    } catch (error) {
      console.error('Error executing findSimilarFamiliesByNeedsTool:', error);
      return {
        error: true,
        message: `Failed to find similar families. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
