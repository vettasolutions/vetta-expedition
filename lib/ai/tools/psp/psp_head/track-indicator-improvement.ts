import { tool } from 'ai';
import { z } from 'zod';

// Refactored to use tool() helper and Zod for parameters, similar to search_antibody.ts
export const trackIndicatorImprovementTool = tool({
  description:
    'Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.',
  parameters: z.object({
    indicator_code_name: z
      .string()
      .describe(
        "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
      ),
    start_color: z
      .number()
      .int()
      .describe(
        'The initial color status code (1=Red, 2=Yellow). Enum: 1 or 2. Must be less than target_color.',
      ),
    target_color: z
      .number()
      .int()
      .describe(
        'The desired final color status code (2=Yellow, 3=Green). Enum: 2 or 3.',
      ),
    time_period_months: z
      .number()
      .int()
      .positive()
      .describe(
        'The lookback period in months (e.g., 6) from the current date.',
      ),
    country_filter: z
      .string()
      .optional()
      .describe(
        "Optional: Filter by specific country code (e.g., 'PY'). From family.country.",
      ),
    organization_id_filter: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Optional: Filter by specific organization ID. From snapshot.organization_id.',
      ),
  }),
  // No execute function, as the backend API route /api/psp/track-indicator-improvement handles execution.
  // The name for the LLM is the key used in the `tools` object in chat/route.ts.
});

// The old structure was a plain object:
// export const trackIndicatorImprovementTool = {
//   name: 'track_indicator_improvement',
//   description:
//     'Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.',
//   parameters: {
//     type: 'object',
//     properties: {
//       indicator_code_name: {
//         type: 'string',
//         description:
//           "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
//       },
//       start_color: {
//         type: 'integer',
//         description: 'The initial color status code (1=Red, 2=Yellow).',
//         // enum: [1, 2]
//       },
//       target_color: {
//         type: 'integer',
//         description: 'The desired final color status code (2=Yellow, 3=Green).',
//         // enum: [2, 3]
//       },
//       time_period_months: {
//         type: 'integer',
//         description:
//           'The lookback period in months (e.g., 6) from the current date.',
//       },
//       country_filter: {
//         type: 'string',
//         description:
//           "Optional: Filter by specific country code (e.g., 'PY'). From family.country.",
//       },
//       organization_id_filter: {
//         type: 'integer',
//         description:
//           'Optional: Filter by specific organization ID. From snapshot.organization_id.',
//       },
//     },
//     required: [
//       'indicator_code_name',
//       'start_color',
//       'target_color',
//       'time_period_months',
//     ],
//   },
// };

// To make this tool discoverable, you might need to export it as part of a collection
// or register it with your AI agent system. For example:
// export default trackIndicatorImprovementTool;

// If you have a central registry file (e.g., lib/ai/tools/index.ts or lib/ai/tools/psp/index.ts),
// you would typically import and re-export this definition there.
