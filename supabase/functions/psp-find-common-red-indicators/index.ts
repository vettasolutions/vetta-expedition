// Supabase Edge Function: psp-find-common-red-indicators
// Triggered by: POST request from the findCommonRedIndicatorsTool

import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function 'psp-find-common-red-indicators' up and running!`);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extract and validate parameters
    const body = await req.json();
    console.log('Received request body:', body);

    // TODO: Zod validation
    const { limit, hubFilterId, projectFilterId } = body;

    // TODO: AuthZ check - Get requesting user's organization ID
    const requestingOrganizationId = 1; // Placeholder

    // 2. Construct the database query
    // Query latest snapshots (snapshot.is_last or snapshot.last_taken_family)
    // Filter by snapshot.organization_id = requestingOrganizationId
    // Filter by hubFilterId (snapshot.application_id) if provided
    // Filter by projectFilterId (snapshot.project_id) if provided
    // Extract indicators with color=1 (Red) from snapshot.stoplight JSON for these snapshots
    // Aggregate counts per indicatorCodeName
    // Calculate percentage based on total families included in the filter
    // Join with stoplight_indicator to get indicatorShortName
    // Order by redFamilyCount descending
    // Limit results by limit parameter
    console.log('Constructing database query with params:', {
      ...body,
      requestingOrganizationId,
    });
    // --- Database Query Placeholder ---
    const dbResult = [
      {
        indicatorCodeName: 'debt',
        indicatorShortName: 'Debt',
        redFamilyCount: 150,
        redFamilyPercentage: 0.35,
      }, // Placeholder
      {
        indicatorCodeName: 'income_stability',
        indicatorShortName: 'Income Stability',
        redFamilyCount: 120,
        redFamilyPercentage: 0.28,
      },
    ];
    // --- End Placeholder ---

    console.log('Database query result (placeholder):', dbResult);

    // 3. Return the result
    return new Response(JSON.stringify(dbResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
