import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  FamilyDetail,
  TrackIndicatorResponse,
  PspConsoleOutput,
} from '@/lib/psp-types';
import { addAuthHeaders, createPspApiUrl } from '../auth';

// Based on docs/mcp-tools-definition.md -> Tools for PSP Head/Data Team -> 1. Improvement Tracker

const trackIndicatorImprovementParams = z.object({
  indicator_code_name: z
    .string()
    .describe(
      "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
    ),
  start_color: z
    .number()
    .int()
    .min(1)
    .max(2)
    .describe('The initial color status code (1=Red, 2=Yellow).'),
  target_color: z
    .number()
    .int()
    .min(2)
    .max(3)
    .describe('The desired final color status code (2=Yellow, 3=Green).'),
  time_period_months: z
    .number()
    .int()
    .positive()
    .describe('The lookback period in months (e.g., 6) from the current date.'),
  country_filter: z
    .string()
    .optional()
    .describe(
      "Optional: Filter by specific country code (e.g., 'PY'). From stoplight_indicator.country or family.country.",
    ),
  organization_id_filter: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter by specific organization ID. From snapshot.organization_id or family.organization_id.',
    ),
});

export const trackIndicatorImprovementTool = tool({
  description:
    'Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.',
  parameters: trackIndicatorImprovementParams,
  execute: async (params: z.infer<typeof trackIndicatorImprovementParams>) => {
    const {
      indicator_code_name,
      start_color,
      target_color,
      time_period_months,
      country_filter,
      organization_id_filter,
    } = params; // Destructure after validation

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
            value: `🔍 Executing trackIndicatorImprovement tool...\n`,
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
  - indicator_code_name: ${indicator_code_name}
  - start_color: ${start_color} (${start_color === 1 ? 'red' : 'yellow'})
  - target_color: ${target_color} (${target_color === 2 ? 'yellow' : 'green'})
  - time_period_months: ${time_period_months}
  ${country_filter ? `- country_filter: ${country_filter}` : ''}
  ${organization_id_filter ? `- organization_id_filter: ${organization_id_filter}` : ''}
      `,
      );

      try {
        console.log(`Executing trackIndicatorImprovementTool with params:`, {
          indicator_code_name,
          start_color,
          target_color,
          time_period_months,
          country_filter,
          organization_id_filter,
        });

        updateConsole('loading_packages', `⏳ Fetching data from database...`);

        // Get the authenticated URL and fetch options
        const apiUrl = createPspApiUrl('/api/psp/track-indicator-improvement');
        const fetchOptions = addAuthHeaders({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            indicator_code_name,
            start_color,
            target_color,
            time_period_months,
            country_filter,
            organization_id_filter,
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

        const data = (await response.json()) as TrackIndicatorResponse;

        // Format the data to make it more user-friendly
        console.log('Received data from backend:', data);

        updateConsole(
          'completed',
          `✅ Data received:
Count: ${data.count} ${data.count === 1 ? 'family' : 'families'}
${
  data.count > 0
    ? `Sample families: ${data.details
        .slice(0, 3)
        .map((d: FamilyDetail) => d.familyCode)
        .join(', ')}${data.details.length > 3 ? '...' : ''}`
    : ''
}
        `,
        );

        // If no improved families were found, provide a helpful message
        if (data.count === 0) {
          return {
            message: `No families found that improved from ${start_color === 1 ? 'red' : 'yellow'} to ${target_color === 2 ? 'yellow' : 'green'} on the '${indicator_code_name}' indicator in the last ${time_period_months} month(s).`,
            count: 0,
            details: [],
          };
        }

        return {
          message: `Found ${data.count} ${data.count === 1 ? 'family' : 'families'} that improved from ${start_color === 1 ? 'red' : 'yellow'} to ${target_color === 2 ? 'yellow' : 'green'} on the '${indicator_code_name}' indicator in the last ${time_period_months} month(s).`,
          count: data.count,
          details: data.details,
        };
      } catch (error) {
        console.error('Error executing trackIndicatorImprovementTool:', error);

        updateConsole(
          'failed',
          `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        );

        // Return a user-friendly error message
        return {
          error: true,
          message: `Failed to track indicator improvement. ${error instanceof Error ? error.message : ''}`,
        };
      }
    } else {
      // Non-browser environment (e.g. server-side)
      try {
        console.log(`Executing trackIndicatorImprovementTool with params:`, {
          indicator_code_name,
          start_color,
          target_color,
          time_period_months,
          country_filter,
          organization_id_filter,
        });

        // Get the authenticated URL and fetch options for server-side
        const apiUrl = createPspApiUrl('/api/psp/track-indicator-improvement');
        const fetchOptions = addAuthHeaders({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            indicator_code_name,
            start_color,
            target_color,
            time_period_months,
            country_filter,
            organization_id_filter,
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

        const data = (await response.json()) as TrackIndicatorResponse;

        // Format the data to make it more user-friendly
        console.log('Received data from backend:', data);

        // If no improved families were found, provide a helpful message
        if (data.count === 0) {
          return {
            message: `No families found that improved from ${start_color === 1 ? 'red' : 'yellow'} to ${target_color === 2 ? 'yellow' : 'green'} on the '${indicator_code_name}' indicator in the last ${time_period_months} month(s).`,
            count: 0,
            details: [],
          };
        }

        return {
          message: `Found ${data.count} ${data.count === 1 ? 'family' : 'families'} that improved from ${start_color === 1 ? 'red' : 'yellow'} to ${target_color === 2 ? 'yellow' : 'green'} on the '${indicator_code_name}' indicator in the last ${time_period_months} month(s).`,
          count: data.count,
          details: data.details,
        };
      } catch (error) {
        console.error('Error executing trackIndicatorImprovementTool:', error);
        // Return a user-friendly error message
        return {
          error: true,
          message: `Failed to track indicator improvement. ${error instanceof Error ? error.message : ''}`,
        };
      }
    }
  },
});

// Add TypeScript declaration for window object
declare global {
  interface Window {
    pspConsoleOutputs: Array<{
      id: string;
      status: 'in_progress' | 'loading_packages' | 'completed' | 'failed';
      contents: Array<{
        type: 'text' | 'image';
        value: string;
      }>;
    }>;
  }
}
