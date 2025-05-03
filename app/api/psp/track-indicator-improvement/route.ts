import { NextResponse } from 'next/server';
import { queryPSP, handleApiError } from '@/lib/db';
import { z } from 'zod';
import { pspAuthMiddleware } from '../auth-middleware';

// Define request schema based on tool parameters from docs/mcp-tools-definition.md
const requestSchema = z.object({
  indicator_code_name: z
    .string()
    .describe('The code name of the indicator to track (e.g., "income").'),
  start_color: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe('The starting color code (1=Red, 2=Yellow, 3=Green).'),
  target_color: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe('The target color code (1=Red, 2=Yellow, 3=Green).'),
  time_period_months: z
    .number()
    .int()
    .positive()
    .describe('Period in months to analyze (e.g., 12, 24, 36).'),
  country_filter: z
    .string()
    .optional()
    .describe('Filter by specific country (optional). Use ISO code.'),
  organization_id_filter: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Filter by specific organization ID (optional).'),
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

    // Base filter conditions that apply to both previous and current snapshots
    const baseConditions = [
      `ss.code_name = $1`,
      `EXISTS (
         SELECT 1 FROM stoplight_analytics.snapshot_stoplight ss2
         WHERE ss2.snapshot_id = s.id
         AND ss2.code_name = $1
       )`,
    ];

    // Add optional filters
    if (params.country_filter) {
      baseConditions.push(`f.country = $4`);
    }

    if (params.organization_id_filter) {
      baseConditions.push(`s.organization_id = $5`);
    }

    // Construct the query parameters array
    const queryParams = [
      params.indicator_code_name,
      params.start_color,
      params.target_color,
    ];

    // Add optional parameters
    if (params.country_filter) {
      queryParams.push(params.country_filter);
    }

    if (params.organization_id_filter) {
      queryParams.push(params.organization_id_filter);
    }

    // Construct the SQL query with Common Table Expressions (CTEs)
    const sql = `
      WITH 
      -- Previous snapshots with the starting color
      previous_snapshots AS (
        SELECT 
          s.family_id,
          s.snapshot_date,
          ss.value
        FROM stoplight_analytics.snapshot s
        JOIN stoplight_analytics.snapshot_stoplight ss ON s.id = ss.snapshot_id
        JOIN stoplight_analytics.family f ON s.family_id = f.family_id
        WHERE 
          ${baseConditions.join(' AND ')}
          AND ss.value = $2
          AND NOT s.is_last
      ),
      
      -- Current snapshots (most recent for each family)
      current_snapshots AS (
        SELECT 
          s.family_id,
          s.snapshot_date,
          ss.value
        FROM stoplight_analytics.snapshot s
        JOIN stoplight_analytics.snapshot_stoplight ss ON s.id = ss.snapshot_id
        JOIN stoplight_analytics.family f ON s.family_id = f.family_id
        WHERE 
          ${baseConditions.join(' AND ')}
          AND s.is_last = true
      ),
      
      -- Families that have both previous and current snapshots
      target_families AS (
        SELECT 
          p.family_id,
          p.snapshot_date AS previous_date,
          p.value AS previous_value,
          c.snapshot_date AS current_date,
          c.value AS current_value,
          c.snapshot_date - p.snapshot_date AS date_diff
        FROM previous_snapshots p
        JOIN current_snapshots c ON p.family_id = c.family_id
        WHERE 
          c.value = $3
          AND c.snapshot_date > p.snapshot_date
          AND c.snapshot_date <= p.snapshot_date + make_interval(months => ${params.time_period_months})
      )
      
      -- Final selection with time-based analysis
      SELECT
        COUNT(DISTINCT family_id) AS improved_count,
        MIN(date_diff) AS min_days,
        MAX(date_diff) AS max_days,
        AVG(date_diff) AS avg_days
      FROM target_families
    `;

    // Log the query and parameters
    console.log('=== EXECUTING SQL QUERY ===');
    console.log('SQL:', sql);
    console.log('PARAMS:', JSON.stringify(queryParams, null, 2));
    console.log('==========================');

    // Execute the query
    const result = await queryPSP(sql, queryParams);

    // Log the result summary
    console.log(`Query returned ${result.rowCount} rows`);

    // Extract the result
    const data = result.rows[0];

    // Format the response
    const response = {
      improvedCount: Number.parseInt(data.improved_count) || 0,
      timeToImprove: {
        minDays: Number.parseInt(data.min_days) || 0,
        maxDays: Number.parseInt(data.max_days) || 0,
        avgDays: Number.parseInt(data.avg_days) || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in track-indicator-improvement:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}
