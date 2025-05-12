import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Define request schema based on discoverAvailableDataTool parameters
const discoverRequestSchema = z.object({
  discovery_type: z
    .enum(['countries', 'indicators'])
    .describe(
      "Specifies whether to list all available 'countries' or all available 'indicators'.",
    ),
  country_code_filter: z
    .string()
    .optional()
    .describe(
      'Optional: If discovery_type is "indicators", you can provide an ISO country code (e.g., \'PY\') to list only indicators available for that country.',
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
    const params = discoverRequestSchema.parse(body);

    let sql = '';
    const queryParams: any[] = [];
    let results: any[] = [];

    if (params.discovery_type === 'countries') {
      if (params.country_code_filter) {
        // Technically, discovery_type 'countries' shouldn't have a country_code_filter
        // as per the tool description. However, if it's provided, we can choose to ignore it
        // or return a specific message. For now, ignoring it.
        console.warn(
          "Warning: country_code_filter provided with discovery_type 'countries'. Filter will be ignored for this discovery_type.",
        );
      }
      sql = `
        SELECT DISTINCT country AS country_code
        FROM ps_families.family
        WHERE country IS NOT NULL
        ORDER BY country_code;
      `;
      const dbResult = await queryPSP(sql);
      results = dbResult.rows.map((row) => ({
        country_code: row.country_code,
      }));
    } else if (params.discovery_type === 'indicators') {
      if (params.country_code_filter) {
        sql = `
          SELECT DISTINCT sst.code_name, sst.dimension
          FROM data_collect.survey_stoplight sst
          JOIN data_collect.snapshot sn ON sst.survey_definition_id = sn.survey_definition_id
          JOIN ps_families.family f ON sn.family_id = f.family_id
          WHERE f.country = $1
          ORDER BY sst.code_name;
        `;
        queryParams.push(params.country_code_filter);
        const dbResult = await queryPSP(sql, queryParams);
        results = dbResult.rows.map((row) => ({
          indicator_code_name: row.code_name,
          dimension: row.dimension,
        }));
      } else {
        // No country filter, list all indicators
        sql = `
          SELECT DISTINCT code_name, dimension
          FROM data_collect.stoplight_indicator -- Or survey_stoplight if that's more appropriate for 'all'
          ORDER BY code_name;
        `;
        // For consistency, let's use survey_stoplight as it includes dimension directly.
        // If stoplight_indicator is preferred, ensure 'dimension' is available or joined.
        sql = `
          SELECT DISTINCT code_name, dimension
          FROM data_collect.survey_stoplight 
          WHERE code_name IS NOT NULL AND dimension IS NOT NULL
          ORDER BY code_name;
        `;
        const dbResult = await queryPSP(sql);
        results = dbResult.rows.map((row) => ({
          indicator_code_name: row.code_name,
          dimension: row.dimension,
        }));
      }
    }

    // Log the query and parameters for debugging
    console.log('=== EXECUTING SQL QUERY: discover_available_data ===');
    console.log('Discovery Type:', params.discovery_type);
    if (params.country_code_filter) {
      console.log('Country Filter:', params.country_code_filter);
    }
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('======================================================');

    return NextResponse.json({
      discovery_type: params.discovery_type,
      country_filter_applied: params.country_code_filter || null,
      count: results.length,
      data: results,
    });
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
