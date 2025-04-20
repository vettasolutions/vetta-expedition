import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Mentors/Social Workers -> 4. Survey Time Optimizer

const analyzeSurveySectionTimeParams = z.object({
  time_period_months: z
    .number()
    .int()
    .positive()
    .default(3)
    .describe(
      'Lookback period in months (default: 3) based on snapshot.created_at.',
    ),
});

export const analyzeSurveySectionTimeTool = tool({
  description:
    'Analyzes the average time spent on different sections (Stoplight, Economic) of the survey for families assigned to the requesting mentor.',
  parameters: analyzeSurveySectionTimeParams,
  execute: async (params: z.infer<typeof analyzeSurveySectionTimeParams>) => {
    const { time_period_months } = params;

    try {
      console.log(
        `Executing analyzeSurveySectionTimeTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-analyze-survey-section-time`
        '/api/placeholder-psp-analyze-survey-section-time', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timePeriodMonths: time_period_months,
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
      // Example expected return: { section: 'Stoplight' | 'Economic'; averageTimeMs: number }[]
      return data;
    } catch (error) {
      console.error('Error executing analyzeSurveySectionTimeTool:', error);
      return {
        error: true,
        message: `Failed to analyze survey section time. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
