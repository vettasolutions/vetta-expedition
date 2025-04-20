import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 2. Country Comparison

const compareIndicatorStatusByCountryParams = z.object({
  indicator_dimension_id: z
    .number()
    .int()
    .positive()
    .describe(
      'The ID of the dimension to analyze (e.g., 1 for Health). From stoplight_indicator.stoplight_dimension_id.',
    ),
  target_color: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe('The color status code to compare (1=Red, 2=Yellow, 3=Green).'),
  metric: z
    .enum(['percentage', 'count'])
    .default('percentage')
    .describe(
      'Whether to compare by percentage or absolute count of families.',
    ),
});

export const compareIndicatorStatusByCountryTool = tool({
  description:
    'Compares the percentage or count of indicators meeting a specific color status across different countries, based on latest family snapshots, optionally filtered by indicator dimension.',
  parameters: compareIndicatorStatusByCountryParams,
  execute: async (
    params: z.infer<typeof compareIndicatorStatusByCountryParams>,
  ) => {
    const { indicator_dimension_id, target_color, metric } = params;

    try {
      console.log(
        `Executing compareIndicatorStatusByCountryTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-compare-indicator-status-by-country`
        '/api/placeholder-psp-compare-indicator-status-by-country', // Placeholder URL
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if needed
          },
          body: JSON.stringify({
            indicatorDimensionId: indicator_dimension_id,
            targetColor: target_color,
            metric: metric,
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
      // Example expected return: { countryCode: string; value: number }[]
      return data;
    } catch (error) {
      console.error(
        'Error executing compareIndicatorStatusByCountryTool:',
        error,
      );
      return {
        error: true,
        message: `Failed to compare indicator status by country. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
