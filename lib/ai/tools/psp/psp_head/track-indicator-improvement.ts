// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document
export const trackIndicatorImprovementTool = {
  name: 'track_indicator_improvement',
  description:
    'Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.',
  parameters: {
    type: 'object',
    properties: {
      indicator_code_name: {
        type: 'string',
        description:
          "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
      },
      start_color: {
        type: 'integer',
        description: 'The initial color status code (1=Red, 2=Yellow).',
        // enum: [1, 2] // The Zod schema in the API handles stricter validation like specific enum values
      },
      target_color: {
        type: 'integer',
        description: 'The desired final color status code (2=Yellow, 3=Green).',
        // enum: [2, 3]
      },
      time_period_months: {
        type: 'integer',
        description:
          'The lookback period in months (e.g., 6) from the current date.',
      },
      country_filter: {
        type: 'string',
        description:
          "Optional: Filter by specific country code (e.g., 'PY'). From family.country.", // Updated description to match API route
      },
      organization_id_filter: {
        type: 'integer',
        description:
          'Optional: Filter by specific organization ID. From snapshot.organization_id.',
      },
    },
    required: [
      'indicator_code_name',
      'start_color',
      'target_color',
      'time_period_months',
    ],
  },
  // You might have a convention for how the AI invokes this, e.g., by referencing the API path.
  // Example:
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/track-indicator-improvement",
  //   method: "POST"
  // }
};

// To make this tool discoverable, you might need to export it as part of a collection
// or register it with your AI agent system. For example:
// export default trackIndicatorImprovementTool;

// If you have a central registry file (e.g., lib/ai/tools/index.ts or lib/ai/tools/psp/index.ts),
// you would typically import and re-export this definition there.
