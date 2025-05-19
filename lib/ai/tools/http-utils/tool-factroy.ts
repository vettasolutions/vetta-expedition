// tool-factory.ts (extend here or separate if preferred)
import { tool } from 'ai';
import { z } from 'zod';

type HttpToolConfig = {
  description: string;
  functionUrl: string;
  parameters: z.ZodObject<any, any>;
  parameterMapping?: (params: any) => any;
};

/**
 * Creates a generic HTTP POST tool (e.g. for Lambda or external APIs)
 */
export function createHttpTool(config: HttpToolConfig) {
  const { description, functionUrl, parameters, parameterMapping } = config;

  return tool({
    description,
    parameters,
    execute: async (params) => {
      const mappedParams = parameterMapping ? parameterMapping(params) : params;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappedParams),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Unexpected error calling Lambda');
      }

      return data;
    },
  });
}
