# PSP Tools Database Schema Assessment

This document evaluates how the tools defined in `docs/mcp-tools-definition.md` align with the actual database structure in the PostgreSQL database.

## Database Schema Overview

The database contains several key views in the `stoplight_analytics` schema:

- `stoplight_indicator`: Contains indicator definitions with `code_name`, `stoplight_dimension_id`, etc.
- `snapshot`: Tracks surveys with `family_id`, `organization_id`, `snapshot_number`, etc.
- `snapshot_stoplight`: Contains indicator values (color codes) for each snapshot
- `family`: Contains family information with relationships to mentors (`user_id`)
- Plus several other supporting views for economic data, achievements, etc.

## Alignment Assessment

### Tools for PSP Head/Data Team

#### Improvement Tracker (`track_indicator_improvement`)
- **✓ SUPPORTED**: The schema has the necessary tables/views (`snapshot`, `snapshot_stoplight`, `family`, `stoplight_indicator`) with required columns.
- **Key Fields Available**: `snapshot_stoplight.value` holds the color values (1=Red, 2=Yellow, 3=Green), and `snapshot_stoplight.code_name` matches `stoplight_indicator.code_name`.

#### Country Comparison (`compare_indicator_status_by_country`)
- **✓ SUPPORTED**: The schema has `family.country`, `stoplight_indicator.stoplight_dimension_id`, and all needed fields to filter/aggregate by country and analyze color distributions.

#### Program Effectiveness / Resistant Indicators (`find_resistant_indicators`)
- **✓ SUPPORTED**: The `snapshot.snapshot_number` field allows identifying baseline vs. follow-up surveys as mentioned in the tool description. The necessary indicator data is available to identify persistently red indicators.

#### Dimension Analysis (`compare_dimensions`)
- **✓ SUPPORTED**: `stoplight_indicator.stoplight_dimension_id` exists as described in the tool definition. While there's no explicit dimensions table, the dimension IDs exist in the indicator table, allowing for comparison across dimensions.

### Tools for Organization Heads

#### Mentor Performance Dashboard (`get_mentor_performance_summary`)
- **✓ SUPPORTED**: `snapshot.survey_user_id` (for mentors), `snapshot.organization_id`, timestamps, and timing fields like `snapshot.stoplight_time` and `snapshot.economic_time` are all present.

#### Intervention Effectiveness (`evaluate_intervention_effectiveness`)
- **✓ SUPPORTED WITH CAVEAT**: While the base tables allow tracking family improvement, the tool definition mentions "intervention" tracking which would likely use `snapshot.project_id` as a proxy. The schema supports this approach.

#### Resource Allocation Optimizer (`find_common_red_indicators`)
- **✓ SUPPORTED**: The schema supports finding red indicators (`snapshot_stoplight.value = 1`) in the latest snapshots (`snapshot.is_last = TRUE`) filtered by organization.

#### Organization Benchmarking (`benchmark_organization_improvement`)
- **✓ SUPPORTED WITH CAVEAT**: The schema supports tracking improvement rates by organization, but the tool's note about "careful consideration of data isolation and aggregation logic" would require careful implementation.

### Tools for Mentors/Social Workers

#### Similar Needs Finder (`find_similar_families_by_needs`)
- **✓ SUPPORTED**: The schema allows filtering by mentor (`family.user_id`) and comparing red indicators across families.

#### Progress Tracker (`track_mentor_family_progress`)
- **✓ SUPPORTED**: The schema supports tracking indicator color changes for families assigned to a specific mentor over time.

#### Intervention Recommender (`recommend_interventions`)
- **✓ SUPPORTED WITH CAVEAT**: The underlying data exists to identify families with similar red indicators, though the concept of "interventions" would require additional business logic.

#### Survey Time Optimizer (`analyze_survey_section_time`)
- **✓ SUPPORTED**: `snapshot.stoplight_time` and `snapshot.economic_time` are present, allowing time analysis as described in the tool definition.

## Conclusion

The database schema in the PostgreSQL instance **strongly supports the tool definitions** in the documentation. All of the core fields mentioned in the tool schemas (indicators, colors, dimensions, timestamps, relationships between families/mentors/organizations) exist in the database.

The main caveats are:
1. Some "dimension" details - while the dimension IDs exist, there does not appear to be a separate dimensions table with names/details.
2. "Intervention" tracking - this appears to be using `project_id` as a proxy.

The plan to build API routes for implementing these tools is well-aligned with the database schema. The data structures needed to support the functionality are present in the database. 