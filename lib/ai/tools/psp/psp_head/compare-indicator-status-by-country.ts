// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document
export const compareIndicatorStatusByCountryTool = {
  name: 'compare_indicator_status_by_country',
  description:
    'Compares the percentage or count of indicators meeting a specific color status across different countries, based on latest family snapshots, optionally filtered by indicator dimension.',
  parameters: {
    type: 'object',
    properties: {
      indicator_dimension_id: {
        type: 'integer',
        description:
          'The ID of the dimension to analyze (e.g., 1 for Health). From stoplight_indicator.stoplight_dimension_id.',
      },
      target_color: {
        type: 'integer',
        // enum: [1, 2, 3], // API handles strict validation
        description:
          'The color status code to compare (1=Red, 2=Yellow, 3=Green).',
      },
      metric: {
        type: 'string',
        // enum: ["percentage", "count"], // API handles strict validation
        description:
          'Whether to compare by percentage or absolute count of indicators.', // Updated from 'families' to 'indicators' to match API
        // default: "percentage" // Default is handled by the API if not provided
      },
    },
    required: ['indicator_dimension_id', 'target_color'],
  },
  // Optional: Add invocation details if your AI system uses them
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/compare-indicator-status-by-country",
  //   method: "POST"
  // }
};

// export default compareIndicatorStatusByCountryTool;
