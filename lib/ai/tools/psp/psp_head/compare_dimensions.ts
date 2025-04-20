import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 4. Dimension Analysis

const compareDimensionsParams = z.object({
  dimension_ids: z
    .array(z.number().int().positive())
    .min(1)
    .describe('An array of stoplight_dimension_id values to compare.'),
  target_color: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(1)
    .describe(
      'The color code to compare (1=Red, 2=Yellow, 3=Green). Default is Red.',
    ),
  metric: z
    .enum(['percentage', 'count'])
    .default('percentage')
    .describe(
      'Whether to compare by percentage or absolute count of families.',
    ),
  country_filter: z
    .string()
    .optional()
    .describe("Optional: Filter by specific country code (e.g., 'PY')."),
});

export const compareDimensionsTool = tool({
  description:
    'Compares the prevalence of a specific indicator color across two or more dimensions, based on latest family snapshots.',
  parameters: compareDimensionsParams,
  execute: async (params: z.infer<typeof compareDimensionsParams>) => {
    const { dimension_ids, target_color, metric, country_filter } = params;

    try {
      console.log(`Executing compareDimensionsTool with params:`, params);

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-compare-dimensions`
        '/api/placeholder-psp-compare-dimensions', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dimensionIds: dimension_ids,
            targetColor: target_color,
            metric: metric,
            countryFilter: country_filter,
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
      // Example expected return: { dimensionId: number; value: number }[]
      return data;
    } catch (error) {
      console.error('Error executing compareDimensionsTool:', error);
      return {
        error: true,
        message: `Failed to compare dimensions. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
