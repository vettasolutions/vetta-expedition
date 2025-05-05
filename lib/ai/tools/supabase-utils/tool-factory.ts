import { tool } from 'ai';
import type { z } from 'zod';
import { supabaseConnector } from './connector';
import { traceable } from 'langsmith/traceable';

type SupabaseToolConfig = {
  description: string;
  functionPath: string;
  parameters: z.ZodObject<any, any>;
  parameterMapping?: (params: any) => any;
};

/**
 * Creates a new tool that calls a Supabase edge function
 */
export function createSupabaseTool(config: SupabaseToolConfig) {
  const { description, functionPath, parameters, parameterMapping } = config;

  return tool({
    description,
    parameters,
    execute: async (params) => {
      // Log tool invocation and parameters
      console.log(
        `[Tool Called] Name: ${functionPath} (via factory), Parameters:`,
        params,
      );

      const mappedParams = parameterMapping ? parameterMapping(params) : params;

      // Wrap the Supabase function call with traceable
      const traceWrappedFunction = traceable(
        async (funcPath: string, funcParams: any) => {
          return await supabaseConnector.callFunction(funcPath, funcParams);
        },
        { name: functionPath }, // Use functionPath as the span name in LangSmith
      );

      // Execute the wrapped function
      return await traceWrappedFunction(functionPath, mappedParams);
    },
  });
}
