import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Schema for find_common_red_indicators
const requestSchema = z.object({
  requesting_organization_id: z // Added as it's implied by user context and SQL
    .number()
    .int()
    .positive()
    .describe(
      'The ID of the organization requesting the data. From snapshot.organization_id.',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe('Number of top red indicators to return.'),
  hub_filter_id: z // from snapshot.application_id
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter results by a specific hub ID (snapshot.application_id).',
    ),
  project_filter_id: z // from snapshot.project_id
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional: Filter results by a specific project ID (snapshot.project_id).',
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

    // SQL based on document, enhanced for short_name and percentage
    let sql = `
      WITH latest_snapshots_for_org AS (
        SELECT s.id as snapshot_id, s.family_id, s.survey_definition_id
        FROM data_collect.snapshot s
        WHERE s.organization_id = $${paramIndex++} -- requesting_organization_id
          AND s.is_last = true -- Document mentions snapshot.is_last or snapshot.last_taken_family
          -- Consider adding AND s.last_taken_family = true if it means the absolute latest snapshot for a family in the org
    `;
    queryParams.push(params.requesting_organization_id);

    if (params.hub_filter_id) {
      sql += ` AND s.application_id = $${paramIndex++} `;
      queryParams.push(params.hub_filter_id);
    }
    if (params.project_filter_id) {
      sql += ` AND s.project_id = $${paramIndex++} `;
      queryParams.push(params.project_filter_id);
    }

    sql += `
      ),
      total_families_in_scope AS (
          SELECT COUNT(DISTINCT ls.family_id) as count
          FROM latest_snapshots_for_org ls
      ),
      red_indicator_counts AS (
        SELECT 
          st.code_name,
          COUNT(DISTINCT ls.family_id) as red_family_count -- Count distinct families per indicator
        FROM data_collect.snapshot_stoplight st
        JOIN latest_snapshots_for_org ls ON st.snapshot_id = ls.snapshot_id
        WHERE st.value = 1 -- Red indicators
        GROUP BY st.code_name
      )
      SELECT 
        ric.code_name AS indicator_code_name,
        ss.short_name AS indicator_short_name, -- Joined to get short_name
        ric.red_family_count,
        CASE 
          WHEN (SELECT count FROM total_families_in_scope) > 0 
          THEN (ric.red_family_count::decimal * 100 / (SELECT count FROM total_families_in_scope))
          ELSE 0 
        END AS red_family_percentage
      FROM red_indicator_counts ric
      -- Assuming survey_stoplight is the source for short_name and is linked via code_name.
      -- This requires a representative survey_definition_id for the organization or a more complex join.
      -- For simplicity, picking one from latest_snapshots_for_org, assuming short_name is consistent per code_name.
      LEFT JOIN data_collect.survey_stoplight ss ON ric.code_name = ss.code_name 
            AND ss.survey_definition_id = (SELECT survey_definition_id FROM latest_snapshots_for_org LIMIT 1)
      ORDER BY ric.red_family_count DESC
      LIMIT $${paramIndex++}
    `;
    queryParams.push(params.limit);

    console.log('=== EXECUTING SQL QUERY: find-common-red-indicators ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('========================================================');

    const result = await queryPSP(sql, queryParams);

    const responseData = result.rows.map((row) => ({
      indicatorCodeName: row.indicator_code_name,
      indicatorShortName: row.indicator_short_name, // Might be null if join fails
      redFamilyCount: Number(row.red_family_count),
      redFamilyPercentage: Number(
        Number.parseFloat(row.red_family_percentage).toFixed(2),
      ),
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in find-common-red-indicators:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
