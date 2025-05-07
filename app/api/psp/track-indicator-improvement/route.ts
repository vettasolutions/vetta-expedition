import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Define request schema based on track_indicator_improvement tool
const requestSchema = z
  .object({
    indicator_code_name: z
      .string()
      .min(1)
      .describe(
        "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name.",
      ),
    start_color: z
      .number()
      .int()
      .pipe(z.union([z.literal(1), z.literal(2)]))
      .describe('The initial color status code (1=Red, 2=Yellow).'),
    target_color: z
      .number()
      .int()
      .pipe(z.union([z.literal(2), z.literal(3)]))
      .describe('The desired final color status code (2=Yellow, 3=Green).'),
    time_period_months: z
      .number()
      .int()
      .positive()
      .describe(
        'The lookback period in months (e.g., 6) from the current date.',
      ),
    country_filter: z
      .string()
      .optional()
      .describe(
        "Optional: Filter by specific country code (e.g., 'PY'). From family.country.",
      ),
    organization_id_filter: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Optional: Filter by specific organization ID. From snapshot.organization_id.',
      ),
  })
  .refine((data) => data.start_color < data.target_color, {
    message:
      'start_color must be less than target_color (e.g., Red to Yellow, Red to Green, Yellow to Green).',
    path: ['start_color', 'target_color'],
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

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Base CTE and main query structure
    let sql = `
      WITH ranked_snapshots AS (
        SELECT
          s.family_id,
          s.snapshot_date,        -- Date of the 'start_color' snapshot
          s.snapshot_number,
          sl.code_name,
          ss.short_name,          -- from data_collect.survey_stoplight for context
          s.organization_id,      -- from data_collect.snapshot for organization_id_filter
          sl.value as current_value,
          LEAD(sl.value) OVER (PARTITION BY s.family_id, sl.code_name ORDER BY s.snapshot_date) as next_value,
          LEAD(s.snapshot_date) OVER (PARTITION BY s.family_id, sl.code_name ORDER BY s.snapshot_date) as next_snapshot_date -- Date of the 'target_color' snapshot
        FROM data_collect.snapshot s
        JOIN data_collect.snapshot_stoplight sl ON s.id = sl.snapshot_id
        JOIN data_collect.survey_stoplight ss ON (ss.survey_definition_id = s.survey_definition_id AND sl.code_name = ss.code_name)
        WHERE
          sl.code_name = $${paramIndex++} 
          AND sl.value = $${paramIndex++} `;
    queryParams.push(params.indicator_code_name, params.start_color);

    if (params.organization_id_filter) {
      sql += ` AND s.organization_id = $${paramIndex++} `;
      queryParams.push(params.organization_id_filter);
    }

    sql += `
      )
      SELECT
        rs.family_id,
        f.code AS family_code, 
        f.name AS family_name, 
        rs.code_name AS indicator_code_name,
        rs.short_name AS indicator_short_name,
        rs.current_value AS original_value,
        rs.next_value AS improved_value,
        rs.snapshot_date AS original_survey_date, 
        rs.next_snapshot_date AS achieved_date    
      FROM ranked_snapshots rs
      JOIN ps_families.family f ON rs.family_id = f.family_id
      WHERE
        rs.next_value = $${paramIndex++} -- target_color
        AND rs.next_snapshot_date IS NOT NULL
        AND to_timestamp(rs.next_snapshot_date) >= (CURRENT_DATE - CAST($${paramIndex++} || ' months' AS INTERVAL)) -- time_period_months
    `;
    queryParams.push(params.target_color);
    queryParams.push(params.time_period_months);

    if (params.country_filter) {
      sql += ` AND f.country = $${paramIndex++} `;
      queryParams.push(params.country_filter);
    }

    sql += ` ORDER BY rs.family_id, rs.code_name, achieved_date;`;

    // Log the query and parameters for debugging
    console.log('=== EXECUTING SQL QUERY: track_indicator_improvement ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('======================================================');

    const result = await queryPSP(sql, queryParams);

    const details = result.rows.map((row) => ({
      familyId: row.family_id,
      familyCode: row.family_code,
      familyName: row.family_name,
      indicatorCodeName: row.indicator_code_name,
      indicatorShortName: row.indicator_short_name,
      originalValue: row.original_value,
      improvedValue: row.improved_value,
      originalSurveyDate: Number(row.original_survey_date), // Assuming Unix timestamp
      achievedDate: Number(row.achieved_date), // Assuming Unix timestamp
    }));

    return NextResponse.json({ count: details.length, details });
  } catch (error) {
    console.error('Error in track-indicator-improvement:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    // Align with the pattern from compare-indicator-status-by-country
    // Assuming handleApiError returns an object like { error: boolean, message: string }
    // and we provide a default status.
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
