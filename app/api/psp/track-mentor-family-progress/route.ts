import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Schema for track_mentor_family_progress
const requestSchema = z.object({
  requesting_mentor_user_id: z // Added from context (snapshot.survey_user_id)
    .number()
    .int()
    .positive()
    .describe('The ID of the mentor for whom to track family progress.'),
  time_period_months: z
    .number()
    .int()
    .positive()
    .default(3)
    .describe('The lookback period in months based on snapshot dates.'),
  min_improvement_level: z
    .enum(['any', 'red_to_yellow', 'yellow_to_green', 'red_to_green'])
    .default('any')
    .describe(
      "Minimum level of improvement to filter by (e.g., 'red_to_yellow').",
    ),
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

    // Base SQL structure from the document's "Progress Tracker"
    let sql = `
      WITH ranked_snapshots AS (
        SELECT 
          s.family_id,
          s.snapshot_date, -- This is the date of the 'previousColor'
          s.snapshot_number,
          sl.code_name AS indicator_code_name, 
          ss.short_name AS indicator_short_name,
          sl.value AS previous_value, -- Renamed from value for clarity
          LEAD(sl.value) OVER (PARTITION BY s.family_id, sl.code_name ORDER BY s.snapshot_date) AS current_value, -- Renamed from next_value
          LEAD(s.snapshot_date) OVER (PARTITION BY s.family_id, sl.code_name ORDER BY s.snapshot_date) AS achievement_date -- Date of current_value
        FROM data_collect.snapshot s
        JOIN data_collect.snapshot_stoplight sl ON s.id = sl.snapshot_id
        JOIN data_collect.survey_stoplight ss ON (
          ss.survey_definition_id = s.survey_definition_id AND sl.code_name = ss.code_name
        )
        WHERE 
          s.survey_user_id = $${paramIndex++}
          -- Filter based on time_period_months for the *achievement_date* (date of current_value)
          AND to_timestamp(LEAD(s.snapshot_date) OVER (PARTITION BY s.family_id, sl.code_name ORDER BY s.snapshot_date)) >= (NOW() - CAST($${paramIndex++} || ' months' AS INTERVAL))
          AND sl.value IN (1, 2) -- Only consider snapshots that can improve (Red or Yellow)
      )
      SELECT DISTINCT -- Distinct families might show multiple improvements, this is for distinct improvement events
        rs.family_id,
        f.code as family_code,
        f.name AS family_name,
        rs.indicator_code_name,
        rs.indicator_short_name,
        rs.previous_value,
        rs.current_value,
        rs.achievement_date
      FROM ranked_snapshots rs
      JOIN ps_families.family f ON rs.family_id = f.family_id
      WHERE rs.current_value IS NOT NULL -- Ensure there is a next snapshot to compare
    `;
    queryParams.push(
      params.requesting_mentor_user_id,
      params.time_period_months,
    );

    // Add conditions based on min_improvement_level
    switch (params.min_improvement_level) {
      case 'red_to_yellow':
        sql += ' AND rs.previous_value = 1 AND rs.current_value = 2';
        break;
      case 'yellow_to_green':
        sql += ' AND rs.previous_value = 2 AND rs.current_value = 3';
        break;
      case 'red_to_green':
        sql += ' AND rs.previous_value = 1 AND rs.current_value = 3';
        break;
      case 'any':
      default:
        sql += ` AND (
                    (rs.previous_value = 1 AND rs.current_value IN (2, 3)) OR 
                    (rs.previous_value = 2 AND rs.current_value = 3)
                  )`;
        break;
    }

    sql += ' ORDER BY f.name, rs.indicator_code_name, rs.achievement_date;';

    console.log('=== EXECUTING SQL QUERY: track-mentor-family-progress ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('========================================================');

    const result = await queryPSP(sql, queryParams);

    const responseData = result.rows.map((row) => ({
      familyId: row.family_id,
      familyCode: row.family_code,
      familyName: row.family_name,
      indicatorCodeName: row.indicator_code_name,
      indicatorShortName: row.indicator_short_name,
      previousColor: row.previous_value,
      currentColor: row.current_value,
      achievementDate: Number(row.achievement_date), // Ensure it's a number (Unix timestamp)
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in track-mentor-family-progress:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
