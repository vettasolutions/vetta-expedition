// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const findCommonRedIndicatorsTool = {
  name: 'find_common_red_indicators',
  description:
    "Finds the most common 'red' indicators (color code 1) among families in the latest snapshots for the specified organization, with optional filters for hub or project.",
  parameters: {
    type: 'object',
    properties: {
      requesting_organization_id: {
        // This was added to API as it was implied by user context
        type: 'integer',
        description:
          'The ID of the organization for which to find common red indicators.',
      },
      limit: {
        type: 'integer',
        // default: 5, // API handles default
        description:
          'Optional: Number of top red indicators to return. Defaults to 5.',
      },
      hub_filter_id: {
        type: 'integer',
        description:
          'Optional: Filter results by a specific hub ID (snapshot.application_id).',
      },
      project_filter_id: {
        type: 'integer',
        description:
          'Optional: Filter results by a specific project ID (snapshot.project_id).',
      },
    },
    // `requesting_organization_id` is essential for the query.
    required: ['requesting_organization_id'],
  },
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/find-common-red-indicators",
  //   method: "POST"
  // }
};

// export default findCommonRedIndicatorsTool;
