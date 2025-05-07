// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const findSimilarFamiliesByNeedsTool = {
  name: 'find_similar_families_by_needs',
  description:
    'Finds families assigned to the requesting mentor with similar indicator statuses (e.g., red indicators) to a specified reference family, based on latest snapshots.',
  parameters: {
    type: 'object',
    properties: {
      requesting_mentor_user_id: {
        // Added to API from context
        type: 'integer',
        description:
          'The user ID of the mentor requesting the similar families. Used to scope the search to their assigned families.',
      },
      reference_family_id: {
        type: 'integer',
        description: 'The family_id of the family to compare against.',
      },
      indicator_code_names: {
        type: 'array',
        items: { type: 'string' },
        description:
          "Optional: Specific indicator code names (e.g., ['income', 'housing']) to focus the similarity search on. If omitted, all indicators of the reference family matching target_similarity_color are considered.",
      },
      target_similarity_color: {
        // Added to API for flexibility
        type: 'integer',
        // default: 1, // API handles default
        description:
          'Optional: The indicator color value (1=Red, 2=Yellow, 3=Green) to consider for similarity. Defaults to 1 (Red).',
      },
      limit: {
        type: 'integer',
        // default: 5, // API handles default
        description:
          'Optional: Maximum number of similar families to return. Defaults to 5.',
      },
    },
    required: ['requesting_mentor_user_id', 'reference_family_id'],
  },
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/find-similar-families-by-needs",
  //   method: "POST"
  // }
};

// export default findSimilarFamiliesByNeedsTool;
