import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Organization Heads -> 4. Organization Benchmarking

const benchmarkOrganizationImprovementParams = z
  .object({
    indicator_code_name: z
      .string()
      .optional()
      .describe(
        'Optional: Code name of the indicator to benchmark (from stoplight_indicator.code_name).',
      ),
    dimension_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Optional: ID of the dimension to benchmark (from stoplight_indicator.stoplight_dimension_id). Specify either indicator or dimension.',
      ),
    time_period_months: z
      .number()
      .int()
      .positive()
      .default(12)
      .describe('Lookback period in months for calculating improvement.'),
    comparison_group: z
      .enum(['all', 'same_country', 'same_type'])
      .default('all')
      .describe(
        'Which group of organizations to compare against (using organizations.country, organizations.type).',
      ),
  })
  .refine((data) => data.indicator_code_name || data.dimension_id, {
    message: 'Either indicator_code_name or dimension_id must be provided.',
  });

export const benchmarkOrganizationImprovementTool = tool({
  description:
    "Compares the improvement rate of the user's organization against others on a specific indicator or dimension. Requires careful data aggregation.",
  parameters: benchmarkOrganizationImprovementParams,
  execute: async (
    params: z.infer<typeof benchmarkOrganizationImprovementParams>,
  ) => {
    const {
      indicator_code_name,
      dimension_id,
      time_period_months,
      comparison_group,
    } = params;

    try {
      console.log(
        `Executing benchmarkOrganizationImprovementTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-benchmark-organization-improvement`
        '/api/placeholder-psp-benchmark-organization-improvement', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            indicatorCodeName: indicator_code_name,
            dimensionId: dimension_id,
            timePeriodMonths: time_period_months,
            comparisonGroup: comparison_group,
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
      // Example expected return: { organizationId: number | 'average'; organizationName?: string; improvementRate: number; }[]
      return data;
    } catch (error) {
      console.error(
        'Error executing benchmarkOrganizationImprovementTool:',
        error,
      );
      return {
        error: true,
        message: `Failed to benchmark organization improvement. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
