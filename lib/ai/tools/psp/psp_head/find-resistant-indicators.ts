import { tool } from 'ai';
import { z } from 'zod';

// Based on the "LLM Tool Schema (Conceptual - needs refinement)" from Vetta Expedition MCP Tool Definitions document
// Adjusted to match the implemented API parameters and behavior.
export const findResistantIndicatorsTool = tool({
  description:
    'Identifies indicators that most frequently remain at a specific color (e.g., Red=1) across multiple snapshots for families, optionally filtered by organization.',
  parameters: z.object({
    resistant_color: z
      .number()
      .int()
      .pipe(z.union([z.literal(1), z.literal(2)]).default(1))
      .optional()
      .describe(
        "The color code considered 'resistant' (1=Red, 2=Yellow). Defaults to 1 (Red).",
      ),
    min_follow_ups: z
      .number()
      .int()
      .positive()
      .default(1)
      .optional()
      .describe(
        'Minimum number of follow-up snapshots where the indicator must appear with the resistant color after the initial baseline. E.g., 1 means color must appear at least twice (baseline + 1 follow-up). Defaults to 1.',
      ),
    organization_id_filter: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Optional: Filter by specific organization ID.'),
  }),
  // No execute function
});

// export default findResistantIndicatorsTool;
