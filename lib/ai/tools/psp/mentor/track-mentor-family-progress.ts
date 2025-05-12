import { tool } from 'ai';
import { z } from 'zod';

// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const trackMentorFamilyProgressTool = tool({
  description:
    'Tracks progress (indicator improvements such as red to yellow) for families assigned to the requesting mentor over a specified period.',
  parameters: z.object({
    requesting_mentor_user_id: z
      .number()
      .int()
      .positive()
      .describe('The user ID of the mentor for whom to track family progress.'),
    time_period_months: z
      .number()
      .int()
      .positive()
      .default(3)
      .optional()
      .describe(
        'Optional: The lookback period in months based on snapshot achievement dates. Defaults to 3 months.',
      ),
    min_improvement_level: z
      .enum(['any', 'red_to_yellow', 'yellow_to_green', 'red_to_green'])
      .default('any')
      .optional()
      .describe(
        "Optional: Minimum level of improvement to filter by (e.g., 'red_to_yellow', 'yellow_to_green', 'red_to_green', or 'any'). Defaults to 'any'.",
      ),
  }),
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/track-mentor-family-progress",
  //   method: "POST"
  // }
});

// export default trackMentorFamilyProgressTool;
