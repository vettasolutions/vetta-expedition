import { tool } from 'ai';
import { z } from 'zod';

// Based on docs/mcp-tools-definition.md -> Tools for Mentors/Social Workers -> 2. Progress Tracker

const trackMentorFamilyProgressParams = z.object({
  time_period_months: z
    .number()
    .int()
    .positive()
    .default(3)
    .describe(
      'The lookback period in months based on snapshot_stoplight_achievement.achievement_date or snapshot dates.',
    ),
  min_improvement_level: z
    .enum(['any', 'red_to_yellow', 'yellow_to_green', 'red_to_green'])
    .default('any')
    .describe(
      "Minimum level of improvement to filter by (e.g., 'red_to_yellow' means color changed from 1 to 2).",
    ),
});

export const trackMentorFamilyProgressTool = tool({
  description:
    'Tracks progress (indicator improvements) for families assigned to the requesting mentor over a specified period.',
  parameters: trackMentorFamilyProgressParams,
  execute: async (params: z.infer<typeof trackMentorFamilyProgressParams>) => {
    const { time_period_months, min_improvement_level } = params;

    try {
      console.log(
        `Executing trackMentorFamilyProgressTool with params:`,
        params,
      );

      // TODO: Replace with actual fetch call to Supabase Edge Function
      const response = await fetch(
        // Example: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/psp-track-mentor-family-progress`
        '/api/placeholder-psp-track-mentor-family-progress', // Placeholder URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timePeriodMonths: time_period_months,
            minImprovementLevel: min_improvement_level,
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
      // Example expected return: { familyId: number; familyCode: string; indicatorCodeName: string; previousColor: 1 | 2; currentColor: 2 | 3; achievementDate: number; }[]
      return data;
    } catch (error) {
      console.error('Error executing trackMentorFamilyProgressTool:', error);
      return {
        error: true,
        message: `Failed to track family progress. ${error instanceof Error ? error.message : ''}`,
      };
    }
  },
});
