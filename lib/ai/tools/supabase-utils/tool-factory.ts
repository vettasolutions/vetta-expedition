import { tool } from 'ai';
import { z } from 'zod';
import { supabaseConnector } from './connector';

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
      return await supabaseConnector.callFunction(functionPath, mappedParams);
    },
  });
}
