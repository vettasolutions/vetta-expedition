import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Organization Heads -> 1. Mentor Performance Dashboard

const getMentorPerformanceSummaryParams = z.object({
  time_period_months: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      'The lookback period in months (e.g., 1 for last month) based on snapshot.created_at or snapshot.snapshot_date.',
    ),
  sort_by: z
    .enum(['survey_count', 'average_time'])
    .default('survey_count')
    .describe('Metric to sort mentors by.'),
  sort_order: z
    .enum(['desc', 'asc'])
    .default('desc')
    .describe('Sort order (descending or ascending).'),
});

export const getMentorPerformanceSummaryTool = tool({
  description:
    "Retrieves a summary of mentor performance including survey count and average survey completion time within the user's organization over a specified period.",
  parameters: getMentorPerformanceSummaryParams,
  execute: async (
    params: z.infer<typeof getMentorPerformanceSummaryParams>,
  ) => {
    const { time_period_months, sort_by, sort_order } = params;

    try {
      console.log(
        `Executing getMentorPerformanceSummaryTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-get-mentor-performance-summary`
        '/api/placeholder-psp-get-mentor-performance-summary', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timePeriodMonths: time_period_months,
            sortBy: sort_by,
            sortOrder: sort_order,
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
      // Example expected return: { mentorUserId: number; mentorName?: string; surveyCount: number; averageTotalTimeMs?: number }[]
      return data;
    } catch (error) {
      console.error('Error executing getMentorPerformanceSummaryTool:', error);
      return {
        error: true,
        message: `Failed to get mentor performance summary. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
