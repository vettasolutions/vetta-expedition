import { tool } from 'ai';
import { z } from 'zod';

// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const findSimilarFamiliesByNeedsTool = tool({
  description:
    'Finds families assigned to the requesting mentor with similar indicator statuses (e.g., red indicators) to a specified reference family, based on latest snapshots.',
  parameters: z.object({
    requesting_mentor_user_id: z
      .number()
      .int()
      .positive()
      .describe(
        'The user ID of the mentor requesting the similar families. Used to scope the search to their assigned families.',
      ),
    reference_family_id: z
      .number()
      .int()
      .positive()
      .describe('The family_id of the family to compare against.'),
    indicator_code_names: z
      .array(z.string().min(1))
      .optional()
      .describe(
        "Optional: Specific indicator code names (e.g., ['income', 'housing']) to focus the similarity search on. If omitted, all indicators of the reference family matching target_similarity_color are considered.",
      ),
    target_similarity_color: z
      .number()
      .int()
      .min(1)
      .max(3)
      .default(1)
      .optional()
      .describe(
        'Optional: The indicator color value (1=Red, 2=Yellow, 3=Green) to consider for similarity. Defaults to 1 (Red).',
      ),
    limit: z
      .number()
      .int()
      .positive()
      .default(5)
      .optional()
      .describe(
        'Optional: Maximum number of similar families to return. Defaults to 5.',
      ),
  }),
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/find-similar-families-by-needs",
  //   method: "POST"
  // }
});

// export default findSimilarFamiliesByNeedsTool;
