export const discoverAvailableDataTool = {
  name: 'discover_available_data',
  description:
    'Lists available countries, or available indicators with their dimension. Can filter indicators by a specific country code to see what indicators are available for it.',
  parameters: {
    type: 'object',
    properties: {
      discovery_type: {
        type: 'string',
        enum: ['countries', 'indicators'],
        description:
          "Specifies whether to list all available 'countries' or all available 'indicators'.",
      },
      country_code_filter: {
        type: 'string',
        description:
          'Optional: If discovery_type is "indicators", you can provide an ISO country code (e.g., \'PY\') to list only indicators available for that country.',
      },
    },
    required: ['discovery_type'],
  },
  // Optional: Add invocation details
  // invocation: {
  //   type: "api_call",
  //   path: "/api/psp/discover-available-data",
  //   method: "POST"
  // }
};

// export default discoverAvailableDataTool;
