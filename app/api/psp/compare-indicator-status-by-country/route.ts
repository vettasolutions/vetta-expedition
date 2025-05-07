import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Define request schema based on tool parameters from docs/mcp-tools-definition.md
const requestSchema = z.object({
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
      'Whether to compare by percentage or absolute count of indicators.',
    ),
});

export async function POST(request: Request) {
  // Check authentication first
  const authResult = await pspAuthMiddleware(request);
  if (authResult) {
    return authResult; // Return unauthorized response if authentication fails
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const params = requestSchema.parse(body);

    let sql: string;
    const queryParams: any[] = [
      params.indicator_dimension_id,
      params.target_color,
    ];

    // SQL based on the document's "Country Comparison" tool
    // This query counts indicators, not families.
    const baseCTE = `
      WITH country_indicator_stats AS (
        SELECT
          def.country_code AS country,
          COUNT(sl.id) AS total_indicators_in_dimension,
          COUNT(CASE WHEN sl.value = $2 THEN 1 END) AS matching_color_indicators
        FROM data_collect.snapshot s
        JOIN data_collect.survey_definition def ON s.survey_definition_id = def.id
        JOIN data_collect.snapshot_stoplight sl ON s.id = sl.snapshot_id
        JOIN data_collect.survey_stoplight ss ON (
          ss.survey_definition_id = s.survey_definition_id AND sl.code_name = ss.code_name
        )
        WHERE
          s.is_last = true
          AND ss.survey_dimension_id = $1 -- indicator_dimension_id
        GROUP BY def.country_code
        HAVING COUNT(sl.id) > 0 -- Ensure country has indicators in this dimension
      )
    `;

    if (params.metric === 'percentage') {
      sql = `
        ${baseCTE}
        SELECT
          country,
          CASE
            WHEN total_indicators_in_dimension > 0 THEN (matching_color_indicators::decimal / total_indicators_in_dimension * 100)
            ELSE 0
          END AS value
        FROM country_indicator_stats
        ORDER BY value DESC;
      `;
    } else {
      // metric === 'count'
      sql = `
        ${baseCTE}
        SELECT
          country,
          matching_color_indicators AS value
        FROM country_indicator_stats
        ORDER BY value DESC;
      `;
    }

    // Log the query and parameters
    console.log(
      '=== EXECUTING SQL QUERY: compare-indicator-status-by-country ===',
    );
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log(
      '=============================================================',
    );

    // Execute the query
    const result = await queryPSP(sql, queryParams);

    // Log the result summary
    console.log(`Query returned ${result.rowCount} rows`);

    // Map the result with country names instead of codes if possible
    // For simplicity, we're just returning the codes for now
    const response = result.rows.map((row) => ({
      countryCode: row.country,
      value: Number(row.value), // Value is already a number from SQL (count or percentage)
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in compare-indicator-status-by-country:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
