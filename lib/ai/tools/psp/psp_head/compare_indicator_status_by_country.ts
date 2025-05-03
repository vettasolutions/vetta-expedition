import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { CountryData, PspConsoleOutput } from '@/lib/psp-types';
import { addAuthHeaders, createPspApiUrl } from '../auth';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 2. Country Comparison

const compareIndicatorStatusByCountryParams = z.object({
  indicator_dimension_id: z
    .number()
    .int()
    .positive()
    .describe(
      'The ID of the dimension to analyze (e.g., 1 for Health). From stoplight_indicator.stoplight_dimension_id.',
    ),
  target_color: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe('The color status code to compare (1=Red, 2=Yellow, 3=Green).'),
  metric: z
    .enum(['percentage', 'count'])
    .default('percentage')
    .describe(
      'Whether to compare by percentage or absolute count of families.',
    ),
});

export const compareIndicatorStatusByCountryTool = tool({
  description:
    'Compares the percentage or count of indicators meeting a specific color status across different countries, based on latest family snapshots, optionally filtered by indicator dimension.',
  parameters: compareIndicatorStatusByCountryParams,
  execute: async (
    params: z.infer<typeof compareIndicatorStatusByCountryParams>,
  ) => {
    const { indicator_dimension_id, target_color, metric } = params;

    // Initialize UI Console output for debugging
    const consoleId = uuidv4();

    // If in browser environment, add info to window object
    if (typeof window !== 'undefined') {
      // Create console object to track execution
      const debugConsole: PspConsoleOutput = {
        id: consoleId,
        status: 'in_progress',
        contents: [
          {
            type: 'text',
            value: `🔍 Executing compareIndicatorStatusByCountry tool...\n`,
          },
        ],
      };

      // Add to window object
      if (!window.pspConsoleOutputs) {
        window.pspConsoleOutputs = [];
      }
      window.pspConsoleOutputs.push(debugConsole);

      // Function to update console
      const updateConsole = (
        status: 'in_progress' | 'loading_packages' | 'completed' | 'failed',
        message: string,
      ) => {
        const index = window.pspConsoleOutputs.findIndex(
          (c) => c.id === consoleId,
        );
        if (index !== -1) {
          window.pspConsoleOutputs[index].status = status;
          window.pspConsoleOutputs[index].contents.push({
            type: 'text',
            value: message,
          });

          // Trigger custom event for components to pick up
          window.dispatchEvent(
            new CustomEvent('psp-console-update', {
              detail: { consoleId },
            }),
          );
        }
      };

      // Show parameters
      updateConsole(
        'in_progress',
        `Parameters:
  - indicator_dimension_id: ${indicator_dimension_id}
  - target_color: ${target_color} (${target_color === 1 ? 'red' : target_color === 2 ? 'yellow' : 'green'})
  - metric: ${metric}
      `,
      );

      try {
        console.log(
          `Executing compareIndicatorStatusByCountryTool with params:`,
          {
            indicator_dimension_id,
            target_color,
            metric,
          },
        );

        updateConsole(
          'loading_packages',
          `⏳ Fetching country data from database...`,
        );

        // Get the authenticated URL and fetch options
        const apiUrl = createPspApiUrl(
          '/api/psp/compare-indicator-status-by-country',
        );
        const fetchOptions = addAuthHeaders({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            indicator_dimension_id,
            target_color,
            metric,
          }),
        });

        // Use our locally implemented API route with authentication
        const response = await fetch(apiUrl, fetchOptions);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            'Error response from backend:',
            response.status,
            errorBody,
          );
          updateConsole(
            'failed',
            `❌ API request failed: ${response.status} - ${errorBody}`,
          );
          throw new Error(
            `Backend request failed with status ${response.status}: ${errorBody}`,
          );
        }

        const data = (await response.json()) as CountryData[];
        console.log('Received data from backend:', data);

        // Get dimension name for display
        const dimensionNames: Record<number, string> = {
          1: 'Health',
          2: 'Housing',
          3: 'Education',
          4: 'Income',
          5: 'Environment',
        };
        const dimensionName =
          dimensionNames[indicator_dimension_id] ||
          `Dimension ${indicator_dimension_id}`;

        updateConsole(
          'completed',
          `✅ Data received:
Found ${data.length} ${data.length === 1 ? 'country' : 'countries'} with data
Dimension: ${dimensionName}
${
  data.length > 0
    ? `Top countries: ${data
        .slice(0, 3)
        .map(
          (d: CountryData) =>
            `${d.countryCode} (${d.value}${metric === 'percentage' ? '%' : ''})`,
        )
        .join(', ')}${data.length > 3 ? '...' : ''}`
    : ''
}
        `,
        );

        // Format the data to make it more user-friendly
        if (data.length === 0) {
          return {
            message: `No data found for countries with ${target_color === 1 ? 'red' : target_color === 2 ? 'yellow' : 'green'} indicators in dimension ID ${indicator_dimension_id}.`,
            data: [],
          };
        }

        // Get color name for readability
        const colorName =
          target_color === 1 ? 'red' : target_color === 2 ? 'yellow' : 'green';

        return {
          message: `Comparison of countries by ${metric} of ${colorName} indicators in ${dimensionName} dimension:`,
          data: data.map((item: CountryData) => ({
            country: item.countryCode,
            value: item.value,
            unit: metric === 'percentage' ? '%' : 'families',
          })),
        };
      } catch (error) {
        console.error(
          'Error executing compareIndicatorStatusByCountryTool:',
          error,
        );

        updateConsole(
          'failed',
          `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        );

        return {
          error: true,
          message: `Failed to compare indicator status by country. ${error instanceof Error ? error.message : ''}`,
        };
      }
    } else {
      // Non-browser environment (e.g. server-side)
      try {
        console.log(
          `Executing compareIndicatorStatusByCountryTool with params:`,
          {
            indicator_dimension_id,
            target_color,
            metric,
          },
        );

        // Get the authenticated URL and fetch options for server-side
        const apiUrl = createPspApiUrl(
          '/api/psp/compare-indicator-status-by-country',
        );
        const fetchOptions = addAuthHeaders({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            indicator_dimension_id,
            target_color,
            metric,
          }),
        });

        // Use our locally implemented API route with authentication
        const response = await fetch(apiUrl, fetchOptions);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            'Error response from backend:',
            response.status,
            errorBody,
          );
          throw new Error(
            `Backend request failed with status ${response.status}: ${errorBody}`,
          );
        }

        const data = (await response.json()) as CountryData[];
        console.log('Received data from backend:', data);

        // Format the data to make it more user-friendly
        if (data.length === 0) {
          return {
            message: `No data found for countries with ${target_color === 1 ? 'red' : target_color === 2 ? 'yellow' : 'green'} indicators in dimension ID ${indicator_dimension_id}.`,
            data: [],
          };
        }

        // Get dimension name (this would ideally come from another API call or a lookup table)
        const dimensionNames: Record<number, string> = {
          1: 'Health',
          2: 'Housing',
          3: 'Education',
          4: 'Income',
          5: 'Environment',
          // Add more mappings as needed
        };
        const dimensionName =
          dimensionNames[indicator_dimension_id] ||
          `Dimension ${indicator_dimension_id}`;

        // Get color name for readability
        const colorName =
          target_color === 1 ? 'red' : target_color === 2 ? 'yellow' : 'green';

        return {
          message: `Comparison of countries by ${metric} of ${colorName} indicators in ${dimensionName} dimension:`,
          data: data.map((item: CountryData) => ({
            country: item.countryCode,
            value: item.value,
            unit: metric === 'percentage' ? '%' : 'families',
          })),
        };
      } catch (error) {
        console.error(
          'Error executing compareIndicatorStatusByCountryTool:',
          error,
        );
        return {
          error: true,
          message: `Failed to compare indicator status by country. ${error instanceof Error ? error.message : ''}`,
        };
      }
    }
  },
});
