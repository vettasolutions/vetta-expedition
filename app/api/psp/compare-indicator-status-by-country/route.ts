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
    .describe('The ID of the dimension to analyze (e.g., 1 for Health).'),
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

    // Construct the SQL query based on the chosen metric
    let sql: string;

    if (params.metric === 'percentage') {
      // Simplified calculation avoiding ROUND function issues
      sql = `
        WITH country_stats AS (
          SELECT 
            f.country,
            COUNT(DISTINCT s.family_id) AS total_families,
            COUNT(DISTINCT CASE WHEN ss.value = $2 THEN s.family_id END) AS matching_families
          FROM stoplight_analytics.snapshot s
          JOIN stoplight_analytics.family f ON s.family_id = f.family_id
          JOIN stoplight_analytics.snapshot_stoplight ss ON s.id = ss.snapshot_id
          JOIN stoplight_analytics.stoplight_indicator si ON ss.code_name = si.code_name
          WHERE 
            s.is_last = true
            AND si.stoplight_dimension_id = $1
          GROUP BY f.country
        )
        SELECT 
          country,
          CASE 
            WHEN total_families > 0 THEN (matching_families::numeric / total_families) * 100
            ELSE 0
          END AS value
        FROM country_stats
        WHERE total_families > 0
        ORDER BY value DESC
      `;
    } else {
      // 'count'
      sql = `
        SELECT 
          f.country,
          COUNT(DISTINCT s.family_id) AS value
        FROM stoplight_analytics.snapshot s
        JOIN stoplight_analytics.family f ON s.family_id = f.family_id
        JOIN stoplight_analytics.snapshot_stoplight ss ON s.id = ss.snapshot_id
        JOIN stoplight_analytics.stoplight_indicator si ON ss.code_name = si.code_name
        WHERE 
          s.is_last = true
          AND si.stoplight_dimension_id = $1
          AND ss.value = $2
        GROUP BY f.country
        ORDER BY value DESC
      `;
    }

    // Log the query and parameters
    console.log('=== EXECUTING SQL QUERY ===');
    console.log('SQL:', sql);
    console.log(
      'PARAMS:',
      JSON.stringify(
        [params.indicator_dimension_id, params.target_color],
        null,
        2,
      ),
    );
    console.log('==========================');

    // Execute the query
    const result = await queryPSP(sql, [
      params.indicator_dimension_id,
      params.target_color,
    ]);

    // Log the result summary
    console.log(`Query returned ${result.rowCount} rows`);

    // Map the result with country names instead of codes if possible
    // For simplicity, we're just returning the codes for now
    const response = result.rows.map((row) => ({
      countryCode: row.country,
      value: Number.parseFloat(row.value),
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
