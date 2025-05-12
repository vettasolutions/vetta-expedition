import { tool } from 'ai';
import { z } from 'zod';

// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document
export const compareIndicatorStatusByCountryTool = tool({
  description:
    'Compares the percentage or count of indicators meeting a specific color status across different countries, based on latest family snapshots, optionally filtered by indicator dimension.',
  parameters: z.object({
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
      .optional()
      .describe(
        'Whether to compare by percentage or absolute count of indicators. Defaults to percentage.',
      ),
  }),
  // Optional: Add invocation details if your AI system uses them
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/compare-indicator-status-by-country",
  //   method: "POST"
  // }
});

// export default compareIndicatorStatusByCountryTool;
