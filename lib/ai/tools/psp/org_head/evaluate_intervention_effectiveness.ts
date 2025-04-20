import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Organization Heads -> 2. Intervention Effectiveness

const evaluateInterventionEffectivenessParams = z.object({
  intervention_identifier: z
    .string()
    .describe(
      'Identifier for the intervention (e.g., project ID from snapshot.project_id, or a specific time range). How are interventions tracked?',
    ),
  indicator_code_name: z
    .string()
    .optional()
    .describe(
      'Optional: Focus on improvement in a specific indicator (from stoplight_indicator.code_name).',
    ),
  comparison_period_months: z
    .number()
    .int()
    .positive()
    .default(6)
    .describe(
      'Time period (in months) before and after the intervention start date to compare snapshots.',
    ),
});

export const evaluateInterventionEffectivenessTool = tool({
  description:
    "Evaluates family improvement on specific indicators after a presumed intervention period or within a specific project within the user's organization.",
  parameters: evaluateInterventionEffectivenessParams,
  execute: async (
    params: z.infer<typeof evaluateInterventionEffectivenessParams>,
  ) => {
    const {
      intervention_identifier,
      indicator_code_name,
      comparison_period_months,
    } = params;

    try {
      console.log(
        `Executing evaluateInterventionEffectivenessTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-evaluate-intervention-effectiveness`
        '/api/placeholder-psp-evaluate-intervention-effectiveness', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interventionIdentifier: intervention_identifier,
            indicatorCodeName: indicator_code_name,
            comparisonPeriodMonths: comparison_period_months,
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
      // Example expected return: { familyId: number; familyCode: string; improvementScore: number; /* other relevant details */ }[]
      return data;
    } catch (error) {
      console.error(
        'Error executing evaluateInterventionEffectivenessTool:',
        error,
      );
      return {
        error: true,
        message: `Failed to evaluate intervention effectiveness. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
