import { tool } from 'ai';
import { z } from 'zod';

export const discoverAvailableDataTool = tool({
  description:
    'Lists available countries, or available indicators with their dimension. Can filter indicators by a specific country code to see what indicators are available for it.',
  parameters: z.object({
    discovery_type: z
      .enum(['countries', 'indicators'])
      .describe(
        "Specifies whether to list all available 'countries' or all available 'indicators'.",
      ),
    country_code_filter: z
      .string()
      .optional()
      .describe(
        'Optional: If discovery_type is "indicators", you can provide an ISO country code (e.g., \'PY\') to list only indicators available for that country.',
      ),
  }),
});
