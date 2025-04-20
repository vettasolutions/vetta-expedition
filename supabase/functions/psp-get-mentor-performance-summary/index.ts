// Supabase Edge Function: psp-get-mentor-performance-summary
// Triggered by: POST request from the getMentorPerformanceSummaryTool

import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function 'psp-get-mentor-performance-summary' up and running!`);

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
    const { timePeriodMonths, sortBy, sortOrder } = body;

    // TODO: AuthZ check - Get requesting user's organization ID
    // const { user, organizationId } = await getUserAndOrgFromRequest(req);
    // if (!organizationId) { return new Response("Unauthorized: Organization context missing", { status: 401, headers: corsHeaders }); }
    const requestingOrganizationId = 1; // Placeholder

    // 2. Construct the database query
    // Query snapshot view
    // Filter by snapshot.organization_id = requestingOrganizationId
    // Filter by snapshot.created_at or snapshot.snapshot_date within timePeriodMonths
    // Group by snapshot.survey_user_id (mentorUserId)
    // Calculate count(*) as surveyCount
    // Calculate avg(snapshot.stoplight_time + snapshot.economic_time) as averageTotalTimeMs
    // Join with user table (e.g., security.users) on survey_user_id to get mentorName (Optional)
    // Order by surveyCount or averageTotalTimeMs based on sortBy and sortOrder
    console.log('Constructing database query with params:', {
      ...body,
      requestingOrganizationId,
    });
    // --- Database Query Placeholder ---
    const dbResult = [
      {
        mentorUserId: 101,
        mentorName: 'Alice',
        surveyCount: 55,
        averageTotalTimeMs: 1200000,
      }, // Placeholder
      {
        mentorUserId: 102,
        mentorName: 'Bob',
        surveyCount: 48,
        averageTotalTimeMs: 1150000,
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
