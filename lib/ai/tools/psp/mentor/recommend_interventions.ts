import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Mentors/Social Workers -> 3. Intervention Recommender

const recommendInterventionsParams = z.object({
  target_family_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional: The family_id for whom the recommendation is sought.'),
  red_indicator_code_names: z
    .array(z.string())
    .min(1)
    .describe(
      "List of current red indicator code names for the target profile (e.g., ['income', 'transportation']).",
    ),
});

export const recommendInterventionsTool = tool({
  description:
    "Recommends interventions based on success patterns for families with similar indicator profiles within the mentor's context.",
  parameters: recommendInterventionsParams,
  execute: async (params: z.infer<typeof recommendInterventionsParams>) => {
    const { target_family_id, red_indicator_code_names } = params;

    try {
      console.log(`Executing recommendInterventionsTool with params:`, params);

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-recommend-interventions`
        '/api/placeholder-psp-recommend-interventions', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetFamilyId: target_family_id,
            redIndicatorCodeNames: red_indicator_code_names,
            // Requesting mentor's user ID and Organization ID needs to be passed implicitly/securely
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
      // Example expected return: { interventionIdentifier: string; interventionDescription?: string; suggestedReason: string; successRate?: number }[]
      return data;
    } catch (error) {
      console.error('Error executing recommendInterventionsTool:', error);
      return {
        error: true,
        message: `Failed to recommend interventions. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
