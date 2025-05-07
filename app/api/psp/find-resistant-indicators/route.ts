import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Schema for find_resistant_indicators
const requestSchema = z.object({
  resistant_color: z
    .number()
    .int()
    .pipe(z.union([z.literal(1), z.literal(2)])) // Red or Yellow
    .default(1) // Default to Red
    .describe("The color code considered 'resistant' (default: 1=Red)."),
  min_follow_ups: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      'Minimum number of follow-up snapshots required for a family to be included.',
    ),
  organization_id_filter: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional: Filter by specific organization ID.'),
});

export async function POST(request: Request) {
  const authResult = await pspAuthMiddleware(request);
  if (authResult) {
    return authResult;
  }

  try {
    const body = await request.json();
    const params = requestSchema.parse(body);

    const queryParams: any[] = [];
    let paramIndex = 1;

    // SQL based on the document's "Program Effectiveness (Resistant Indicators)" tool
    // The SQL identifies indicators that remained a specific color across multiple snapshots for active families.
    // The min_follow_ups parameter implies we should count how many times an indicator shows up with resistant_color.
    // The provided SQL uses COUNT(*) > 1 for this. We will parameterize this threshold based on min_follow_ups.
    // The original SQL also has `f.is_active = true` which is good practice.

    let sql = `
      WITH indicator_progression AS (
        SELECT 
          s.family_id,
          f.name AS family_name,
          sl.code_name AS indicator_code_name, -- Renamed to avoid conflict
          ss.short_name AS indicator_short_name, -- Renamed
          s.snapshot_number,
          s.snapshot_date,
          sl.value,
          s.organization_id -- For filtering
        FROM data_collect.snapshot s
        JOIN data_collect.snapshot_stoplight sl ON s.id = sl.snapshot_id
        JOIN data_collect.survey_stoplight ss ON (
          ss.survey_definition_id = s.survey_definition_id
          AND sl.code_name = ss.code_name
        )
        JOIN ps_families.family f ON s.family_id = f.family_id
        WHERE 
          sl.value = $${paramIndex++} -- resistant_color
          AND f.is_active = true
    `;
    queryParams.push(params.resistant_color);

    if (params.organization_id_filter) {
      sql += ` AND s.organization_id = $${paramIndex++} `;
      queryParams.push(params.organization_id_filter);
    }

    sql += `
      )
      SELECT 
        family_id,
        family_name,
        indicator_code_name,
        indicator_short_name, -- Changed from indicator_name
        COUNT(*) AS times_resistant_color, -- Changed from times_red
        MIN(to_char(to_timestamp(snapshot_date), 'YYYY-MM-DD')) AS first_resistant_date, -- Changed
        MAX(to_char(to_timestamp(snapshot_date), 'YYYY-MM-DD')) AS last_resistant_date -- Changed
      FROM indicator_progression
      GROUP BY 
        family_id,
        family_name,
        indicator_code_name,
        indicator_short_name
      HAVING COUNT(*) >= $${paramIndex++} -- min_follow_ups (interpreting as number of times color appears)
      ORDER BY 
        times_resistant_color DESC,
        family_id,
        indicator_code_name;
    `;
    // The number of times a color must appear is min_follow_ups + 1 (baseline + N follow_ups)
    // However, the schema suggests min_follow_ups refers to snapshot_number > 1.
    // The SQL COUNT(*) > 1 meant it appeared red more than once.
    // If min_follow_ups is 1, it means baseline + 1 follow-up, so COUNT(*) should be >= 2.
    // So, HAVING COUNT(*) >= (min_follow_ups + 1) is appropriate.
    queryParams.push(params.min_follow_ups + 1);

    console.log('=== EXECUTING SQL QUERY: find-resistant-indicators ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('=====================================================');

    const result = await queryPSP(sql, queryParams);

    const responseData = result.rows.map((row) => ({
      familyId: row.family_id,
      familyName: row.family_name,
      indicatorCodeName: row.indicator_code_name,
      indicatorShortName: row.indicator_short_name,
      timesResistantColor: Number(row.times_resistant_color),
      firstResistantDate: row.first_resistant_date,
      lastResistantDate: row.last_resistant_date,
      // Note: resistanceRate per indicator is not directly calculated by this query.
      // This provides details for each family/indicator pair meeting criteria.
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in find-resistant-indicators:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
