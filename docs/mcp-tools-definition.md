# Vetta Expedition MCP Tool Definitions

This document outlines the conceptual definitions for the Model Context Protocol (MCP) tools, designed for LLM function calling. For each tool, we provide:

1.  **User Type:** Who typically uses this tool.
2.  **Natural Language Query Example:** A sample user query.
3.  **Description:** What the tool does.
4.  **LLM Tool Schema (Conceptual):** A draft JSON schema describing the tool for the LLM.
5.  **Backend Function Signature (Conceptual):** A potential signature for the function on the AWS backend.

*(Note: Tool Schemas and Backend Signatures require database schema details for accurate parameter definition)*

---

## Tools for PSP Head/Data Team

### 1. Improvement Tracker

*   **User Type:** PSP Head/Data Team
*   **Natural Language Query:** "Show me how many families have improved from red to green on income indicators across all countries in the last 6 months"
*   **Description:** Analyzes baseline vs. follow-up surveys (`snapshot.snapshot_number`) or snapshot achievements (`snapshot_stoplight_achievement`) to track indicator color changes over a time period.
*   **LLM Tool Schema (Refined):**
    ```json
    {
      "name": "track_indicator_improvement",
      "description": "Tracks the number of families whose specified indicator improved from a starting color to a target color within a given timeframe, optionally filtered by country or organization.",
      "parameters": {
        "type": "object",
        "properties": {
          "indicator_code_name": { 
            "type": "string", 
            "description": "Code name of the indicator to track (e.g., 'income', 'clean_water'). From stoplight_indicator.code_name."
          },
          "start_color": { 
            "type": "integer", 
            "enum": [1, 2], 
            "description": "The initial color status code (1=Red, 2=Yellow)."
          },
          "target_color": { 
            "type": "integer", 
            "enum": [2, 3], 
            "description": "The desired final color status code (2=Yellow, 3=Green)."
          },
          "time_period_months": { 
            "type": "integer", 
            "description": "The lookback period in months (e.g., 6) from the current date."
          },
          "country_filter": { 
            "type": "string", 
            "description": "Optional: Filter by specific country code (e.g., 'PY'). From stoplight_indicator.country or family.country."
          },
          "organization_id_filter": {
            "type": "integer",
            "description": "Optional: Filter by specific organization ID. From snapshot.organization_id or family.organization_id."
          }
        },
        "required": ["indicator_code_name", "start_color", "target_color", "time_period_months"]
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    // Based on snapshot_stoplight_achievement view
    async function trackIndicatorImprovement(params: {
      indicatorCodeName: string;
      startColor: 1 | 2;
      targetColor: 2 | 3;
      timePeriodMonths: number;
      countryFilter?: string; // Assuming country linked via family/org
      organizationIdFilter?: number;
    }): Promise<{ count: number; details?: { familyId: number; familyCode: string; achievedDate: number }[] }>;
    ```

### 2. Country Comparison

*   **User Type:** PSP Head/Data Team
*   **Natural Language Query:** "Which countries have the highest percentage of green indicators in the Health dimension?"
*   **Description:** Aggregates and compares indicator colors across countries based on the latest snapshot data (`snapshot.is_last` or `snapshot.last_taken_family`), focusing on a specific dimension.
*   **LLM Tool Schema (Refined):**
    ```json
     {
      "name": "compare_indicator_status_by_country",
      "description": "Compares the percentage or count of indicators meeting a specific color status across different countries, based on latest family snapshots, optionally filtered by indicator dimension.",
      "parameters": {
        "type": "object",
        "properties": {
           "indicator_dimension_id": { 
             "type": "integer", 
             "description": "The ID of the dimension to analyze (e.g., 1 for Health). From stoplight_indicator.stoplight_dimension_id."
           },
           "target_color": { 
             "type": "integer", 
             "enum": [1, 2, 3], 
             "description": "The color status code to compare (1=Red, 2=Yellow, 3=Green)." 
           },
           "metric": { 
             "type": "string", 
             "enum": ["percentage", "count"], 
             "description": "Whether to compare by percentage or absolute count of families.", 
             "default": "percentage" 
           }
         },
         "required": ["indicator_dimension_id", "target_color"]
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    async function compareIndicatorStatusByCountry(params: {
      indicatorDimensionId: number;
      targetColor: 1 | 2 | 3;
      metric: 'percentage' | 'count';
    }): Promise<{ countryCode: string; value: number }[]>; // Assuming countryCode derived from family/org
    ```

### 3. Program Effectiveness (Resistant Indicators)

*   **User Type:** PSP Head/Data Team
*   **Natural Language Query:** "What are the most resistant indicators that stay red even after follow-up surveys?"
*   **Description:** Identifies indicators with the lowest improvement rates (e.g., remain color code 1) across the dataset by comparing baseline (`snapshot_number=1`) and follow-up (`snapshot_number>1`) snapshots.
*   **LLM Tool Schema (Conceptual - needs refinement):**
    ```json
    {
      "name": "find_resistant_indicators",
      "description": "Identifies indicators that most frequently remain at a specific color (e.g., Red=1) between baseline and follow-up surveys.",
      "parameters": {
        "type": "object",
        "properties": {
          "resistant_color": { 
            "type": "integer", 
            "enum": [1, 2], 
            "default": 1, 
            "description": "The color code considered 'resistant' (default: 1=Red)." 
          },
          "min_follow_ups": { 
            "type": "integer", 
            "default": 1, 
            "description": "Minimum number of follow-up snapshots required for a family to be included."
          },
           "organization_id_filter": {
             "type": "integer",
             "description": "Optional: Filter by specific organization ID."
           }
        },
        "required": []
      }
    }
    ```
*   **Backend Function Signature (Conceptual - needs refinement):**
    ```typescript
    async function findResistantIndicators(params: {
      resistantColor?: 1 | 2;
      minFollowUps?: number;
      organizationIdFilter?: number;
    }): Promise<{ indicatorCodeName: string; resistanceRate: number }[]>;
    ```

### 4. Dimension Analysis

*   **User Type:** PSP Head/Data Team
*   **Natural Language Query:** "Compare the Housing and Income dimensions across all countries to see which has more red indicators"
*   **Description:** Allows cross-dimension comparison of indicator statuses based on latest snapshot data, potentially filtered by geographic regions (countries).
*   **LLM Tool Schema (Conceptual - needs refinement):**
    ```json
    {
      "name": "compare_dimensions",
      "description": "Compares the prevalence of a specific indicator color across two or more dimensions, based on latest family snapshots.",
      "parameters": {
        "type": "object",
        "properties": {
          "dimension_ids": {
            "type": "array",
            "items": { "type": "integer" },
            "description": "An array of stoplight_dimension_id values to compare."
          },
          "target_color": {
            "type": "integer",
            "enum": [1, 2, 3],
            "default": 1,
            "description": "The color code to compare (1=Red, 2=Yellow, 3=Green). Default is Red."
          },
          "metric": { 
             "type": "string", 
             "enum": ["percentage", "count"], 
             "description": "Whether to compare by percentage or absolute count of families.", 
             "default": "percentage" 
           },
           "country_filter": { 
             "type": "string", 
             "description": "Optional: Filter by specific country code (e.g., 'PY')."
           }
        },
        "required": ["dimension_ids"]
      }
    }
    ```
*   **Backend Function Signature (Conceptual - needs refinement):**
    ```typescript
    async function compareDimensions(params: {
      dimensionIds: number[];
      targetColor?: 1 | 2 | 3;
      metric?: 'percentage' | 'count';
      countryFilter?: string;
    }): Promise<{ dimensionId: number; value: number }[]>;
    ```

---

## Tools for Organization Heads

### 1. Mentor Performance Dashboard

*   **User Type:** Organization Heads
*   **Natural Language Query:** "Which mentors completed the most surveys last month and what was their average survey time?"
*   **Description:** Analyzes survey counts (`snapshot`) and completion times (`snapshot.stoplight_time`, `snapshot.economic_time`) per mentor (`snapshot.survey_user_id`) within the requesting user's organization (`snapshot.organization_id`) over a time period.
*   **LLM Tool Schema (Refined):**
    ```json
    {
      "name": "get_mentor_performance_summary",
      "description": "Retrieves a summary of mentor performance including survey count and average survey completion time within the user's organization over a specified period.",
      "parameters": {
        "type": "object",
        "properties": {
          "time_period_months": { 
            "type": "integer", 
            "default": 1,
            "description": "The lookback period in months (e.g., 1 for last month) based on snapshot.created_at or snapshot.snapshot_date."
          },
          "sort_by": { 
             "type": "string", 
             "enum": ["survey_count", "average_time"], 
             "default": "survey_count",
             "description": "Metric to sort mentors by."
           },
           "sort_order": { 
             "type": "string", 
             "enum": ["desc", "asc"], 
             "default": "desc",
             "description": "Sort order (descending or ascending)."
           }
        },
        "required": [] 
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    // Assumes requestingOrganizationId is passed from user context
    async function getMentorPerformanceSummary(params: {
      requestingOrganizationId: number; // from snapshot.organization_id
      timePeriodMonths?: number;
      sortBy?: 'survey_count' | 'average_time';
      sortOrder?: 'desc' | 'asc';
    }): Promise<{ 
      mentorUserId: number; // from snapshot.survey_user_id
      mentorName?: string; // Requires join to user table (e.g., security.users)
      surveyCount: number; 
      averageTotalTimeMs?: number // Avg of (snapshot.stoplight_time + snapshot.economic_time)
    }[]>;
    ```

### 2. Intervention Effectiveness

*   **User Type:** Organization Heads
*   **Natural Language Query:** "Show me which families have improved the most after receiving our financial literacy program"
*   **Description:** Tracks family indicator improvement between snapshots, potentially correlating with specific projects or time periods associated with interventions within the organization. (Requires clear definition/tracking of 'interventions').
*   **LLM Tool Schema (Conceptual - Needs Intervention definition):**
    ```json
    {
      "name": "evaluate_intervention_effectiveness",
      "description": "Evaluates family improvement on specific indicators after a presumed intervention period or within a specific project within the user's organization.",
      "parameters": {
        "type": "object",
        "properties": {
          "intervention_identifier": { 
            "type": "string", 
            "description": "Identifier for the intervention (e.g., project ID from snapshot.project_id, or a specific time range). How are interventions tracked?"
          },
          "indicator_code_name": { 
            "type": "string", 
            "description": "Optional: Focus on improvement in a specific indicator (from stoplight_indicator.code_name)."
          },
          "comparison_period_months": { 
            "type": "integer", 
            "default": 6, 
            "description": "Time period (in months) before and after the intervention start date to compare snapshots."
          }
        },
        "required": ["intervention_identifier"]
      }
    }
    ```
*   **Backend Function Signature (Conceptual - Needs Intervention definition):**
    ```typescript
    // Assumes requestingOrganizationId is passed from user context
    // Needs clarity on how interventions are identified/linked (e.g., via project_id?)
    async function evaluateInterventionEffectiveness(params: {
      requestingOrganizationId: number;
      interventionIdentifier: string; // Could be project_id (number) or other identifier
      indicatorCodeName?: string;
      comparisonPeriodMonths?: number;
    }): Promise<{ familyId: number; familyCode: string; improvementScore: number; /* other relevant details */ }[]>;
    ```

### 3. Resource Allocation Optimizer

*   **User Type:** Organization Heads
*   **Natural Language Query:** "Where should we focus our resources next month based on the most common red indicators?"
*   **Description:** Identifies the most prevalent 'red' (color code 1) indicators based on the latest snapshots (`snapshot.is_last` or `snapshot.last_taken_family`) within the user's organization (`snapshot.organization_id`) to suggest resource allocation priorities.
*   **LLM Tool Schema (Refined):**
    ```json
    {
      "name": "find_common_red_indicators",
      "description": "Finds the most common 'red' indicators (color code 1) among families in the latest snapshots for the user's organization.",
      "parameters": {
        "type": "object",
        "properties": {
          "limit": { 
            "type": "integer", 
            "default": 5, 
            "description": "Number of top red indicators to return."
          },
          "hub_filter_id": { 
            "type": "integer", 
            "description": "Optional: Filter results by a specific hub ID (snapshot.application_id)."
           },
           "project_filter_id": { 
             "type": "integer", 
             "description": "Optional: Filter results by a specific project ID (snapshot.project_id)."
            }
        },
        "required": []
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    // Assumes requestingOrganizationId is passed from user context
    async function findCommonRedIndicators(params: {
      requestingOrganizationId: number; // from snapshot.organization_id
      limit?: number;
      hubFilterId?: number; // from snapshot.application_id
      projectFilterId?: number; // from snapshot.project_id
    }): Promise<{ indicatorCodeName: string; indicatorShortName?: string; redFamilyCount: number; redFamilyPercentage: number }[]>; // indicatorShortName needs join to stoplight_indicator
    ```

### 4. Organization Benchmarking

*   **User Type:** Organization Heads
*   **Natural Language Query:** "How does our organization compare to others in improving education indicators?"
*   **Description:** Compares indicator improvement rates (e.g., using `snapshot_stoplight_achievement` or comparing baseline/follow-up `snapshot` data) between the user's organization and other organizations. (Requires careful consideration of data isolation and aggregation logic).
*   **LLM Tool Schema (Conceptual - Needs Data Sharing/Aggregation Logic):**
    ```json
    {
      "name": "benchmark_organization_improvement",
      "description": "Compares the improvement rate of the user's organization against others on a specific indicator or dimension. Requires careful data aggregation.",
      "parameters": {
        "type": "object",
        "properties": {
          "indicator_code_name": { 
            "type": "string", 
            "description": "Optional: Code name of the indicator to benchmark (from stoplight_indicator.code_name)."
          },
          "dimension_id": { 
            "type": "integer", 
            "description": "Optional: ID of the dimension to benchmark (from stoplight_indicator.stoplight_dimension_id). Specify either indicator or dimension."
          },
          "time_period_months": { 
            "type": "integer", 
            "default": 12, 
            "description": "Lookback period in months for calculating improvement."
          },
          "comparison_group": { 
            "type": "string", 
            "enum": ["all", "same_country", "same_type"],
            "default": "all",
            "description": "Which group of organizations to compare against (using organizations.country, organizations.type)."
          }
        },
        "required": [] // Either indicator_code_name or dimension_id should be provided logically
      }
    }
    ```
*   **Backend Function Signature (Conceptual - Needs Data Sharing/Aggregation Logic):**
    ```typescript
    // Assumes requestingOrganizationId is passed from user context
    // Requires complex aggregation and careful handling of data access across organizations
    async function benchmarkOrganizationImprovement(params: {
      requestingOrganizationId: number;
      indicatorCodeName?: string;
      dimensionId?: number;
      timePeriodMonths?: number;
      comparisonGroup?: 'all' | 'same_country' | 'same_type';
    }): Promise<{ 
      organizationId: number | 'average'; 
      organizationName?: string; // Needs join
      improvementRate: number; 
    }[]>; // Returns data for requesting org + comparison group(s)
    ```

---

## Tools for Mentors/Social Workers

### 1. Similar Needs Finder

*   **User Type:** Mentors/Social Workers
*   **Natural Language Query:** "Find me families with similar needs to the Gonzalez family, especially regarding income and housing"
*   **Description:** Finds families assigned to the requesting mentor (`family.user_id`) who share similar 'red' indicator profiles based on the latest snapshot (`snapshot.is_last`/`last_taken_family`) compared to a reference family.
*   **LLM Tool Schema (Refined):**
    ```json
    {
      "name": "find_similar_families_by_needs",
      "description": "Finds families assigned to the requesting mentor with similar red indicators to a specified reference family, based on latest snapshots.",
      "parameters": {
        "type": "object",
        "properties": {
          "reference_family_id": { 
            "type": "integer", 
            "description": "The family_id of the family to compare against."
          },
          "indicator_code_names": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Optional: Specific indicator code names (e.g., ['income', 'housing']) to focus the similarity search on."
          },
          "limit": { 
            "type": "integer", 
            "default": 5, 
            "description": "Maximum number of similar families to return."
          }
        },
        "required": ["reference_family_id"]
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    // Assumes requestingMentorUserId is passed from user context
    async function findSimilarFamiliesByNeeds(params: {
      requestingMentorUserId: number; // Used to filter family.user_id
      referenceFamilyId: number;
      indicatorCodeNames?: string[];
      limit?: number;
    }): Promise<{ familyId: number; familyCode: string; similarityScore: number; commonRedIndicators: string[] }[]>;
    ```

### 2. Progress Tracker

*   **User Type:** Mentors/Social Workers
*   **Natural Language Query:** "Show me all my families who have improved at least one indicator from red to yellow in the last 3 months"
*   **Description:** Monitors progress (indicator color changes, e.g., using `snapshot_stoplight_achievement`) for families assigned to the requesting mentor (`family.user_id`) over a specified period.
*   **LLM Tool Schema (Refined):**
    ```json
    {
      "name": "track_mentor_family_progress",
      "description": "Tracks progress (indicator improvements) for families assigned to the requesting mentor over a specified period.",
      "parameters": {
        "type": "object",
        "properties": {
          "time_period_months": { 
            "type": "integer", 
            "default": 3,
            "description": "The lookback period in months based on snapshot_stoplight_achievement.achievement_date or snapshot dates."
          },
          "min_improvement_level": {
             "type": "string", 
             "enum": ["any", "red_to_yellow", "yellow_to_green", "red_to_green"], 
             "default": "any",
             "description": "Minimum level of improvement to filter by (e.g., 'red_to_yellow' means color changed from 1 to 2)."
           }
        },
        "required": []
      }
    }
    ```
*   **Backend Function Signature (Refined):**
    ```typescript
    // Assumes requestingMentorUserId is passed from user context
    async function trackMentorFamilyProgress(params: {
      requestingMentorUserId: number; // Used to filter families via family.user_id -> snapshot
      timePeriodMonths?: number;
      minImprovementLevel?: 'any' | 'red_to_yellow' | 'yellow_to_green' | 'red_to_green';
    }): Promise<{ 
      familyId: number; 
      familyCode: string; 
      indicatorCodeName: string; 
      previousColor: 1 | 2;
      currentColor: 2 | 3;
      achievementDate: number; 
    }[]>; // Likely uses snapshot_stoplight_achievement joined with family/snapshot
    ```

### 3. Intervention Recommender

*   **User Type:** Mentors/Social Workers
*   **Natural Language Query:** "What interventions have worked best for families like the Garcias who have red indicators in income and transportation?"
*   **Description:** Suggests potentially effective interventions based on historical success patterns for similar families (having specific red indicators) within the mentor's organization or context. (Requires definition/tracking of 'interventions' and 'success').
*   **LLM Tool Schema (Conceptual - Needs Intervention/Success definition):**
    ```json
    {
      "name": "recommend_interventions",
      "description": "Recommends interventions based on success patterns for families with similar indicator profiles within the mentor's context.",
      "parameters": {
        "type": "object",
        "properties": {
          "target_family_id": { 
            "type": "integer", 
            "description": "Optional: The family_id for whom the recommendation is sought."
          },
          "red_indicator_code_names": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of current red indicator code names for the target profile (e.g., ['income', 'transportation'])."
          }
        },
        "required": ["red_indicator_code_names"]
      }
    }
    ```
*   **Backend Function Signature (Conceptual - Needs Intervention/Success definition):**
    ```typescript
    // Assumes requestingMentorUserId and organizationId passed from user context
    // Needs definition of 'intervention' and how 'success' is measured/linked
    async function recommendInterventions(params: {
      requestingMentorUserId: number;
      requestingOrganizationId: number;
      targetFamilyId?: number;
      redIndicatorCodeNames: string[];
    }): Promise<{ interventionIdentifier: string; interventionDescription?: string; suggestedReason: string; successRate?: number }[]>;
    ```

### 4. Survey Time Optimizer

*   **User Type:** Mentors/Social Workers
*   **Natural Language Query:** "Which indicators are taking my families the longest time to complete in surveys?"
*   **Description:** Analyzes survey completion time (`snapshot.stoplight_time`, `snapshot.economic_time`) to identify bottlenecks. (Note: `snapshot` view only provides overall time, not per-indicator time).
*   **LLM Tool Schema (Conceptual - Needs per-indicator time data):**
    ```json
    {
      "name": "analyze_survey_section_time",
      "description": "Analyzes the average time spent on different sections (Stoplight, Economic) of the survey for families assigned to the requesting mentor.",
      "parameters": {
        "type": "object",
        "properties": {
           "time_period_months": { 
             "type": "integer", 
             "default": 3, 
             "description": "Lookback period in months (default: 3) based on snapshot.created_at."
           }
         },
         "required": []
      }
    }
    ```
*   **Backend Function Signature (Conceptual - Limited by available data):**
    ```typescript
    // Assumes requestingMentorUserId is passed from user context
    // Can only analyze overall stoplight_time and economic_time from the snapshot view
    async function analyzeSurveySectionTime(params: {
      requestingMentorUserId: number; // Filter families via family.user_id -> snapshot
      timePeriodMonths?: number;
    }): Promise<{ section: 'Stoplight' | 'Economic'; averageTimeMs: number }[]>;
    ```

--- 