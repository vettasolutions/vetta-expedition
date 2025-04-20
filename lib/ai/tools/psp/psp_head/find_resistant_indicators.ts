import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 3. Program Effectiveness (Resistant Indicators)

const findResistantIndicatorsParams = z.object({
  resistant_color: z
    .number()
    .int()
    .min(1)
    .max(2)
    .default(1)
    .describe("The color code considered 'resistant' (default: 1=Red)."),
  min_follow_ups: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      'Minimum number of follow-up snapshots required for a family to be included.',
    ),
  organization_id_filter: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional: Filter by specific organization ID.'),
});

export const findResistantIndicatorsTool = tool({
  description:
    'Identifies indicators that most frequently remain at a specific color (e.g., Red=1) between baseline and follow-up surveys.',
  parameters: findResistantIndicatorsParams,
  execute: async (params: z.infer<typeof findResistantIndicatorsParams>) => {
    const { resistant_color, min_follow_ups, organization_id_filter } = params;

    try {
      console.log(`Executing findResistantIndicatorsTool with params:`, params);

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-find-resistant-indicators`
        '/api/placeholder-psp-find-resistant-indicators', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resistantColor: resistant_color,
            minFollowUps: min_follow_ups,
            organizationIdFilter: organization_id_filter,
            // Pass requesting user info if needed
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
      // Example expected return: { indicatorCodeName: string; resistanceRate: number }[]
      return data;
    } catch (error) {
      console.error('Error executing findResistantIndicatorsTool:', error);
      return {
        error: true,
        message: `Failed to find resistant indicators. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
