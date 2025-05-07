import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Schema for find_similar_families_by_needs
const requestSchema = z.object({
  requesting_mentor_user_id: z // Added as it's implied by user context and SQL (snapshot.survey_user_id)
    .number()
    .int()
    .positive()
    .describe(
      'The ID of the mentor requesting the data. Used to filter families assigned to the mentor.',
    ),
  reference_family_id: z
    .number()
    .int()
    .positive()
    .describe('The family_id of the family to compare against.'),
  indicator_code_names: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Optional: Specific indicator code names (e.g., ['income', 'housing']) to focus the similarity search on.",
    ),
  target_similarity_color: z // Added to make the target color for matching configurable
    .number()
    .int()
    .min(1)
    .max(3) // 1=Red, 2=Yellow, 3=Green
    .default(1) // Default to Red for finding "needs"
    .describe(
      'The indicator color value to consider for similarity (default: 1 for Red).',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe('Maximum number of similar families to return.'),
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

    // Step 1: Get the relevant indicator code names and their status for the reference family
    // on their latest snapshot, considering only the indicators if a list is provided.
    let referenceFamilyIndicatorsSql = `
        SELECT st.code_name
        FROM data_collect.snapshot_stoplight st
        JOIN data_collect.snapshot s ON st.snapshot_id = s.id
        WHERE s.family_id = $${paramIndex++}
          AND s.is_last = true -- Consider only the latest snapshot for the reference family
          AND st.value = $${paramIndex++} -- target_similarity_color
    `;
    queryParams.push(
      params.reference_family_id,
      params.target_similarity_color,
    );

    if (params.indicator_code_names && params.indicator_code_names.length > 0) {
      referenceFamilyIndicatorsSql += ` AND st.code_name = ANY($${paramIndex++}::text[]) `;
      queryParams.push(params.indicator_code_names);
    }
    referenceFamilyIndicatorsSql += ';';

    console.log(
      '=== EXECUTING SQL QUERY (Step 1 - Ref Family Indicators): find-similar-families-by-needs ===',
    );
    console.log('SQL:', referenceFamilyIndicatorsSql);
    console.log('PARAMS (Step 1):', JSON.stringify(queryParams, null, 2));
    const refFamilyResult = await queryPSP(
      referenceFamilyIndicatorsSql,
      queryParams,
    );

    const relevantIndicatorCodes = refFamilyResult.rows.map((r) => r.code_name);

    if (relevantIndicatorCodes.length === 0) {
      return NextResponse.json([]); // No relevant indicators for the reference family matching the criteria
    }

    // Reset queryParams for the main query
    const mainQueryParams: any[] = [];
    paramIndex = 1;

    // SQL based on document's "Similar Needs Finder"
    // Modified to use relevantIndicatorCodes from Step 1 and provide common indicators list.
    // Filters for families assigned to the requesting mentor.
    let sql = `
      SELECT 
        f.family_id, 
        f.code AS family_code,
        f.name AS family_name,
        COUNT(st.code_name) AS similarity_score, -- Number of shared indicators with the target_similarity_color
        array_agg(st.code_name) AS common_indicator_codes -- List of common indicators
      FROM data_collect.snapshot_stoplight st
      JOIN data_collect.snapshot s ON st.snapshot_id = s.id
      JOIN ps_families.family f ON s.family_id = f.family_id
      WHERE s.is_last = true -- Consider only latest snapshots for other families
        AND s.survey_user_id = $${paramIndex++} -- Filter by requesting_mentor_user_id
        AND f.family_id != $${paramIndex++} -- Exclude the reference family itself
        AND st.value = $${paramIndex++} -- target_similarity_color for other families
        AND st.code_name = ANY($${paramIndex++}::text[]) -- Match only the relevant indicators from reference family
    `;
    mainQueryParams.push(
      params.requesting_mentor_user_id,
      params.reference_family_id,
      params.target_similarity_color,
      relevantIndicatorCodes,
    );

    // If specific indicator_code_names were provided in the request for filtering,
    // ensure the similarity search is also limited to those, redundant with ANY but good for clarity/safety.
    if (params.indicator_code_names && params.indicator_code_names.length > 0) {
      sql += ` AND st.code_name = ANY($${paramIndex++}::text[]) `;
      mainQueryParams.push(params.indicator_code_names);
    }

    sql += `
      GROUP BY f.family_id, f.code, f.name
      HAVING COUNT(st.code_name) > 0 -- Ensure there's at least one common indicator
      ORDER BY similarity_score DESC, f.family_id
      LIMIT $${paramIndex++};
    `;
    mainQueryParams.push(params.limit);

    console.log(
      '=== EXECUTING SQL QUERY (Step 2 - Main Query): find-similar-families-by-needs ===',
    );
    console.log('SQL:', sql);
    console.log('PARAMS (Step 2):', JSON.stringify(mainQueryParams, null, 2));
    console.log(
      '==================================================================================',
    );

    const result = await queryPSP(sql, mainQueryParams);

    const responseData = result.rows.map((row) => ({
      familyId: row.family_id,
      familyCode: row.family_code,
      familyName: row.family_name,
      similarityScore: Number(row.similarity_score),
      commonIndicatorCodes: row.common_indicator_codes, // This will be an array from array_agg
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in find-similar-families-by-needs:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
