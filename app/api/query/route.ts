import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/utils/db';
import { matchQueryWithLLM, matchQueryBasic } from '@/utils/mcp-query-matcher';
import { QUERY_TEMPLATES } from '@/utils/query-templates';

export async function POST(req: NextRequest) {
  try {
    const {
      query,
      userType,
      organizationId = 1,
      userId = 1,
    } = await req.json();

    // Attempt to match query using LLM
    let matchResult = null;

    try {
      // First try the LLM-based matching
      matchResult = await matchQueryWithLLM(query, userType);
      console.log('LLM match result:', matchResult);
    } catch (error) {
      console.error('Error using LLM for query matching:', error);
      // Fallback to basic matching
      matchResult = matchQueryBasic(query, userType);
      console.log('Basic match result:', matchResult);
    }

    if (!matchResult) {
      return NextResponse.json(
        { error: 'Could not determine query type from your question.' },
        { status: 400 },
      );
    }

    const { queryType, params, confidence, reasoning } = matchResult;

    // Get the template
    const template = QUERY_TEMPLATES[userType]?.[queryType];

    if (!template) {
      return NextResponse.json(
        { error: 'Query template not found' },
        { status: 400 },
      );
    }

    // Add default params if not provided
    const enrichedParams = {
      organization_id: organizationId,
      mentor_id: userId,
      ...params,
    };

    // Build the function call
    const paramValues = template.params.map(
      (param) => enrichedParams[param] ?? null,
    );
    const fnCall = `SELECT * FROM ${template.function}(${template.params.map((_, i) => `$${i + 1}`).join(', ')})`;

    console.log(`Executing: ${fnCall} with params:`, paramValues);

    // Execute the query
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query(fnCall, paramValues);

      return NextResponse.json({
        data: result.rows,
        meta: {
          queryType,
          description: template.description,
          paramValues,
          confidence,
          reasoning,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Query execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 },
    );
  }
}
