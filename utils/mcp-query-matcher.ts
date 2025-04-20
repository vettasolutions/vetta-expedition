import OpenAI from 'openai';
import { QUERY_TEMPLATES, QueryTemplate } from './query-templates';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MatchResult {
  queryType: string;
  params: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * Generates a prompt for the LLM to identify the most appropriate query template
 */
function generatePrompt(query: string, userType: string): string {
  const templates = QUERY_TEMPLATES[userType] || {};

  // Create a description of available functions for this user type
  const functionDescriptions = Object.entries(templates)
    .map(([queryType, template]) => {
      return `
Function: ${template.function}
Description: ${template.description}
Parameters: ${template.params.join(', ')}
Query Type: ${queryType}
Example Queries:
${template.examples.map((ex) => `- "${ex}"`).join('\n')}
`;
    })
    .join('\n---\n');

  // Build the prompt
  return `
You are an AI assistant for the Poverty Stoplight MCP system. Your task is to analyze a natural language query and match it to the most appropriate database function based on the user's role and intent.

USER TYPE: ${userType}

AVAILABLE FUNCTIONS:
${functionDescriptions}

USER QUERY: "${query}"

Analyze the user's query and determine:
1. Which function best matches the user's intent
2. What parameter values should be extracted from the query
3. Your confidence level (0-100%) in this match
4. Your reasoning for this selection

Respond in the following JSON format:
{
  "queryType": "string", // The matching query type from the options
  "params": {
    // Parameter name-value pairs extracted from the query
    // For dates, use YYYY-MM-DD format
    // For missing parameters, provide reasonable defaults
  },
  "confidence": number, // 0-100, your confidence in this match
  "reasoning": "string" // Brief explanation of why this function was selected
}
`;
}

/**
 * Extract date information, providing defaults if not specified
 */
function extractDateInfo(query: string): {
  start_date: string;
  end_date: string;
} {
  // In a full implementation, we would parse dates from the query
  // For the POC, we'll use defaults - last 6 months to today
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

/**
 * Use an LLM to match a natural language query to a database function
 */
export async function matchQueryWithLLM(
  query: string,
  userType: string,
): Promise<MatchResult | null> {
  try {
    const prompt = generatePrompt(query, userType);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use an appropriate model
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that matches natural language queries to database functions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2, // Low temperature for more consistent results
    });

    const content = completion.choices[0]?.message.content;

    if (!content) {
      console.error('No response from LLM');
      return null;
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Could not extract JSON from LLM response:', content);
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as MatchResult;

    // Enhance with default values for common parameters
    const queryTemplate = QUERY_TEMPLATES[userType]?.[result.queryType];

    if (!queryTemplate) {
      console.error(
        `Query type ${result.queryType} not found for user type ${userType}`,
      );
      return null;
    }

    // Add default parameters if missing
    const defaultParams: Record<string, any> = {
      organization_id: 1, // Default organization ID
      mentor_id: 1, // Default mentor ID
    };

    // Add date parameters if needed and not provided
    if (
      queryTemplate.params.includes('start_date') ||
      queryTemplate.params.includes('end_date')
    ) {
      if (!result.params.start_date || !result.params.end_date) {
        const dates = extractDateInfo(query);
        if (!result.params.start_date)
          result.params.start_date = dates.start_date;
        if (!result.params.end_date) result.params.end_date = dates.end_date;
      }
    }

    // Merge default params with extracted params
    result.params = { ...defaultParams, ...result.params };

    return result;
  } catch (error) {
    console.error('Error matching query with LLM:', error);
    return null;
  }
}

/**
 * Fallback to basic matching if LLM is not available
 */
export function matchQueryBasic(
  query: string,
  userType: string,
): MatchResult | null {
  // Simple keyword matching as fallback
  const lowerQuery = query.toLowerCase();
  const templates = QUERY_TEMPLATES[userType] || {};

  // Match based on example queries
  for (const [queryType, template] of Object.entries(templates)) {
    for (const example of template.examples) {
      const lowerExample = example.toLowerCase();

      // Find common words between query and example
      const queryWords = new Set(lowerQuery.split(/\s+/));
      const exampleWords = new Set(lowerExample.split(/\s+/));
      const commonWords = [...queryWords].filter(
        (word) => exampleWords.has(word) && word.length > 3, // Only count significant words
      );

      // If there are enough common significant words, consider it a match
      if (commonWords.length >= 3) {
        return {
          queryType,
          params: {
            organization_id: 1,
            mentor_id: 1,
            // Add other default parameters as needed
            ...extractDateInfo(query),
          },
          confidence: 60, // Medium confidence for keyword matching
          reasoning:
            'Basic keyword matching found similarities with example queries',
        };
      }
    }
  }

  // If no match found, try to match based on description
  for (const [queryType, template] of Object.entries(templates)) {
    const lowerDescription = template.description.toLowerCase();

    // Look for key terms from the description in the query
    const descriptionKeywords = lowerDescription
      .split(/\s+/)
      .filter((word) => word.length > 4);
    const matchCount = descriptionKeywords.filter((keyword) =>
      lowerQuery.includes(keyword),
    ).length;

    if (matchCount >= 2) {
      return {
        queryType,
        params: {
          organization_id: 1,
          mentor_id: 1,
          // Add other default parameters as needed
          ...extractDateInfo(query),
        },
        confidence: 40, // Lower confidence for description matching
        reasoning: 'Matched based on description keywords',
      };
    }
  }

  // Fall back to first template if nothing matches
  const firstQueryType = Object.keys(templates)[0];
  if (firstQueryType) {
    return {
      queryType: firstQueryType,
      params: {
        organization_id: 1,
        mentor_id: 1,
        ...extractDateInfo(query),
      },
      confidence: 20, // Very low confidence
      reasoning: 'No clear match found, using default function',
    };
  }

  return null;
}
