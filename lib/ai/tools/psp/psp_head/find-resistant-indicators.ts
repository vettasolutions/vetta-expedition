// Based on the "LLM Tool Schema (Conceptual - needs refinement)" from Vetta Expedition MCP Tool Definitions document
// Adjusted to match the implemented API parameters and behavior.
export const findResistantIndicatorsTool = {
  name: 'find_resistant_indicators',
  description:
    'Identifies indicators that most frequently remain at a specific color (e.g., Red=1) across multiple snapshots for families, optionally filtered by organization.',
  parameters: {
    type: 'object',
    properties: {
      resistant_color: {
        type: 'integer',
        // enum: [1, 2], // API handles strict validation via Zod
        // default: 1, // API handles default via Zod
        description:
          "The color code considered 'resistant' (1=Red, 2=Yellow). Defaults to 1 (Red).",
      },
      min_follow_ups: {
        type: 'integer',
        // default: 1, // API handles default via Zod
        description:
          'Minimum number of follow-up snapshots where the indicator must appear with the resistant color after the initial baseline. For example, 1 means the color must appear at least twice (baseline + 1 follow-up). Defaults to 1.',
      },
      organization_id_filter: {
        type: 'integer',
        description: 'Optional: Filter by specific organization ID.',
      },
    },
    // 'required' array is based on what the API considers non-optional before defaults apply.
    // In the API, all have defaults or are optional, so the list could be empty if the LLM should rely on defaults.
    // However, explicitly stating them can be clearer for the LLM if it should typically provide them.
    // For now, let's consider them non-required for the LLM if API has defaults.
    required: [],
  },
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/find-resistant-indicators",
  //   method: "POST"
  // }
};

// export default findResistantIndicatorsTool;
