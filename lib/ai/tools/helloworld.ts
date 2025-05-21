import { z } from 'zod';
import { createHttpTool } from './http-utils/tool-factroy';

/**
 * Say hello to a user using the Hello World Lambda function
 */
export const helloWorldLambda = createHttpTool({
  description:
    'Returns a personalised greeting message from the Hello World Lambda function',
  functionUrl:
    'https://yi5dmxnr3k.execute-api.us-east-2.amazonaws.com/helloWorld', // TODO: Replace with actual URL
  parameters: z.object({
    name: z.string().describe('The name of the person to greet'),
  }),
});
