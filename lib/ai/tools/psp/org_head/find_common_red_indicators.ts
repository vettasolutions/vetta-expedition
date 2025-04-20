import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Organization Heads -> 3. Resource Allocation Optimizer

const findCommonRedIndicatorsParams = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe('Number of top red indicators to return.'),
  hub_filter_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter results by a specific hub ID (snapshot.application_id).',
    ),
  project_filter_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter results by a specific project ID (snapshot.project_id).',
    ),
});

export const findCommonRedIndicatorsTool = tool({
  description:
    "Finds the most common 'red' indicators (color code 1) among families in the latest snapshots for the user's organization.",
  parameters: findCommonRedIndicatorsParams,
  execute: async (params: z.infer<typeof findCommonRedIndicatorsParams>) => {
    const { limit, hub_filter_id, project_filter_id } = params;

    try {
      console.log(`Executing findCommonRedIndicatorsTool with params:`, params);

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-find-common-red-indicators`
        '/api/placeholder-psp-find-common-red-indicators', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: limit,
            hubFilterId: hub_filter_id,
            projectFilterId: project_filter_id,
            // Requesting user's organization ID needs to be passed implicitly/securely
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
      // Example expected return: { indicatorCodeName: string; indicatorShortName?: string; redFamilyCount: number; redFamilyPercentage: number }[]
      return data;
    } catch (error) {
      console.error('Error executing findCommonRedIndicatorsTool:', error);
      return {
        error: true,
        message: `Failed to find common red indicators. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
