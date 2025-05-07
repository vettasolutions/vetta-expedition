import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

const requestSchema = z.object({
  discovery_type: z
    .enum(['countries', 'indicators'])
    .describe('Specifies whether to list available countries or indicators.'),
  country_code_filter: z
    .string()
    .optional()
    .describe(
      'Optional: If discovery_type is "indicators", filter indicators by this ISO country code.',
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

    let sql: string;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.discovery_type === 'countries') {
      // For discovering countries, we don't currently use indicator_filter from the initial thought,
      // sticking to the simpler version from refined plan.
      sql = `SELECT DISTINCT def.country_code FROM data_collect.survey_definition def ORDER BY def.country_code;`;
    } else {
      // discovery_type === 'indicators'
      if (params.country_code_filter) {
        sql = `
          SELECT DISTINCT 
            sl.code_name,
            ss.short_name,
            sdim.dimension_name
          FROM data_collect.snapshot_stoplight sl
          JOIN data_collect.snapshot s ON sl.snapshot_id = s.id
          JOIN data_collect.survey_definition def ON s.survey_definition_id = def.id
          JOIN data_collect.survey_stoplight ss ON sl.code_name = ss.code_name AND def.id = ss.survey_definition_id
          JOIN data_collect.survey_dimension sdim ON ss.survey_dimension_id = sdim.id
          WHERE def.country_code = $${paramIndex++}
          ORDER BY sdim.dimension_name, ss.short_name, sl.code_name;
        `;
        queryParams.push(params.country_code_filter);
      } else {
        sql = `
          SELECT DISTINCT 
            sl.code_name, 
            ss.short_name, 
            sdim.dimension_name 
          FROM data_collect.snapshot_stoplight sl
          JOIN data_collect.survey_stoplight ss ON sl.code_name = ss.code_name 
          JOIN data_collect.survey_dimension sdim ON ss.survey_dimension_id = sdim.id 
          ORDER BY sdim.dimension_name, ss.short_name, sl.code_name;
        `;
        // Note: survey_definition might be needed if short_name or dimension mapping varies across surveys for the same code_name
        // For a general list, this simpler query joining snapshot_stoplight directly to survey_stoplight (via code_name) and then to dimension should be okay.
        // However, the most accurate distinct list of indicators *active in snapshots* linked to *their specific dimensions in those surveys* would be more complex.
        // The current query for indicators without country filter might show all theoretically possible indicators from survey_stoplight if they share code_names with snapshot_stoplight.
        // A more robust query might involve ensuring ss.survey_definition_id aligns with those present in data_collect.snapshot.
        // For now, using the one from the plan which is simpler.
      }
    }

    console.log('=== EXECUTING SQL QUERY: discover-available-data ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('===================================================');

    const result = await queryPSP(sql, queryParams);

    if (params.discovery_type === 'countries') {
      return NextResponse.json(result.rows.map((row) => row.country_code));
    } else {
      return NextResponse.json(
        result.rows.map((row) => ({
          indicatorCodeName: row.code_name,
          indicatorShortName: row.short_name,
          dimensionName: row.dimension_name,
        })),
      );
    }
  } catch (error) {
    console.error('Error in discover-available-data:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
