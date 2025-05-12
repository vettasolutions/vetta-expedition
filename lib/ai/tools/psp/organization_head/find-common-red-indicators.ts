import { tool } from 'ai';
import { z } from 'zod';

// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const findCommonRedIndicatorsTool = tool({
  description:
    "Finds the most common 'red' indicators (color code 1) among families in the latest snapshots for the specified organization, with optional filters for hub or project.",
  parameters: z.object({
    requesting_organization_id: z
      .number()
      .int()
      .positive()
      .describe(
        'The ID of the organization for which to find common red indicators.',
      ),
    limit: z
      .number()
      .int()
      .positive()
      .default(5)
      .optional()
      .describe(
        'Optional: Number of top red indicators to return. Defaults to 5.',
      ),
    hub_filter_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Optional: Filter results by a specific hub ID (snapshot.application_id).',
      ),
    project_filter_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Optional: Filter results by a specific project ID (snapshot.project_id).',
      ),
  }),
  // No execute function
});

// export default findCommonRedIndicatorsTool;
