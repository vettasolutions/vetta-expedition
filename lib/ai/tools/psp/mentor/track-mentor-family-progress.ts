// Based on the "LLM Tool Schema (Refined)" from Vetta Expedition MCP Tool Definitions document.
// Adjusted for parameters implemented in the API route.
export const trackMentorFamilyProgressTool = {
  name: 'track_mentor_family_progress',
  description:
    'Tracks progress (indicator improvements such as red to yellow) for families assigned to the requesting mentor over a specified period.',
  parameters: {
    type: 'object',
    properties: {
      requesting_mentor_user_id: {
        // Added to API from context
        type: 'integer',
        description:
          'The user ID of the mentor for whom to track family progress.',
      },
      time_period_months: {
        type: 'integer',
        // default: 3, // API handles default
        description:
          'Optional: The lookback period in months based on snapshot achievement dates. Defaults to 3 months.',
      },
      min_improvement_level: {
        type: 'string',
        // enum: ["any", "red_to_yellow", "yellow_to_green", "red_to_green"], // API handles enum validation
        // default: "any", // API handles default
        description:
          "Optional: Minimum level of improvement to filter by (e.g., 'red_to_yellow', 'yellow_to_green', 'red_to_green', or 'any'). Defaults to 'any'.",
      },
    },
    required: ['requesting_mentor_user_id'],
  },
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/track-mentor-family-progress",
  //   method: "POST"
  // }
};

// export default trackMentorFamilyProgressTool;
