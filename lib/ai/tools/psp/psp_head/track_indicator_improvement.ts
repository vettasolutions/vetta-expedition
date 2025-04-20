import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 1. Improvement Tracker

const trackIndicatorImprovementParams = z.object({
  indicator_code_name: z
    .string()
    .describe(
      "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
    ),
  start_color: z
    .number()
    .int()
    .min(1)
    .max(2)
    .describe('The initial color status code (1=Red, 2=Yellow).'),
  target_color: z
    .number()
    .int()
    .min(2)
    .max(3)
    .describe('The desired final color status code (2=Yellow, 3=Green).'),
  time_period_months: z
    .number()
    .int()
    .positive()
    .describe('The lookback period in months (e.g., 6) from the current date.'),
  country_filter: z
    .string()
    .optional()
    .describe(
      "Optional: Filter by specific country code (e.g., 'PY'). From stoplight_indicator.country or family.country.",
    ),
  organization_id_filter: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter by specific organization ID. From snapshot.organization_id or family.organization_id.',
    ),
});

export const trackIndicatorImprovementTool = tool({
  description:
    'Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.',
  parameters: trackIndicatorImprovementParams,
  execute: async (params: z.infer<typeof trackIndicatorImprovementParams>) => {
    const {
      indicator_code_name,
      start_color,
      target_color,
      time_period_months,
      country_filter,
      organization_id_filter,
    } = params; // Destructure after validation

    try {
      console.log(`Executing trackIndicatorImprovementTool with params:`, {
        indicator_code_name,
        start_color,
        target_color,
        time_period_months,
        country_filter,
        organization_id_filter,
      });

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Ensure this URL is correct and matches your Supabase function deployment
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-track-indicator-improvement`
        '/api/placeholder-psp-track-indicator-improvement', // Placeholder URL
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if required by your Edge Function
            // 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` // Or service key if needed
          },
          body: JSON.stringify({
            indicatorCodeName: indicator_code_name,
            startColor: start_color,
            targetColor: target_color,
            timePeriodMonths: time_period_months,
            countryFilter: country_filter,
            organizationIdFilter: organization_id_filter,
            // Pass requesting user ID/role/organization if needed for authZ in Edge Function
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

      // TODO: Potentially format the data for presentation or return as is
      console.log('Received data from backend:', data);
      // Example expected return: { count: number; details?: { familyId: number; familyCode: string; achievedDate: number }[] }
      return data;
    } catch (error) {
      console.error('Error executing trackIndicatorImprovementTool:', error);
      // Return a user-friendly error message
      return {
        error: true,
        message: `Failed to track indicator improvement. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
