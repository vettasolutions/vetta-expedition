/**
 * Query template interface for parameterized database functions
 */
export interface QueryTemplate {
  function: string;
  params: string[];
  description: string;
  examples: string[];
}

/**
 * Organized templates by user type and query type
 */
export interface QueryTemplates {
  [userType: string]: {
    [queryType: string]: QueryTemplate;
  };
}

/**
 * Query templates for different user roles
 */
export const QUERY_TEMPLATES: QueryTemplates = {
  // Templates for Mentor/Social Worker role
  mentor: {
    similar_families: {
      function: 'stoplight_analytics.find_similar_families',
      params: ['organization_id', 'mentor_id', 'family_id', 'dimensions'],
      description: 'Find families with similar needs to a specified family',
      examples: [
        'Find me families with similar needs to the Gonzalez family, especially regarding income and housing',
        'Which families have similar red indicators to family #2?',
        'Show families with needs like the Garcia family',
      ],
    },
    family_red_indicators: {
      function: 'stoplight_analytics.get_family_red_indicators',
      params: [
        'organization_id',
        'family_id',
        'from_status',
        'to_status',
        'track_progress',
        'analysis_type',
      ],
      description:
        'Find all red indicators for a specific family or track progress',
      examples: [
        'Show me all red indicators for Family 2',
        'Show me all my families who have improved at least one indicator from red to yellow in the last 3 months',
        'Which indicators are taking my families the longest time to complete in surveys?',
      ],
    },
    intervention_recommender: {
      function: 'stoplight_analytics.recommend_interventions',
      params: ['organization_id', 'family_id', 'dimensions'],
      description:
        'Recommend interventions based on similar family profiles and success patterns',
      examples: [
        'What interventions have worked best for families like the Garcias who have red indicators in income and transportation?',
        "Recommend interventions for the Smith family's housing issues",
        'What programs should I suggest to families with transportation problems?',
      ],
    },
  },

  // Templates for Organization Head role
  organization_head: {
    mentor_performance: {
      function: 'stoplight_analytics.get_mentor_performance',
      params: ['organization_id', 'start_date', 'end_date'],
      description: 'View performance metrics for mentors',
      examples: [
        'Which mentors completed the most surveys last month and what was their average survey time?',
        'Show me mentor performance over the last 6 months',
        'Which social workers have improved the most families in the past quarter?',
      ],
    },
    org_improvement_trends: {
      function: 'stoplight_analytics.get_organization_improvement_trends',
      params: [
        'organization_id',
        'start_date',
        'end_date',
        'program_type',
        'analysis_type',
        'dimensions',
      ],
      description: 'Analyze improvement trends across the organization',
      examples: [
        'Show me which families have improved the most after receiving our financial literacy program',
        'Where should we focus our resources next month based on the most common red indicators?',
        'How does our organization compare to others in improving education indicators?',
      ],
    },
    resource_allocation: {
      function: 'stoplight_analytics.optimize_resource_allocation',
      params: ['organization_id', 'start_date', 'end_date', 'dimensions'],
      description:
        'Suggests resource allocation based on red indicator patterns',
      examples: [
        'Where should we focus our resources next month?',
        'Which programs need more funding based on current results?',
        'What areas should we prioritize for the next quarter?',
      ],
    },
  },

  // Templates for PSP Head/Data Team role
  psp_head: {
    country_comparison: {
      function: 'stoplight_analytics.compare_countries',
      params: [
        'indicator_ids',
        'start_date',
        'end_date',
        'dimensions',
        'status_filter',
        'analysis_type',
      ],
      description: 'Compare indicators across different countries',
      examples: [
        'Which countries have the highest percentage of green indicators in the Health dimension?',
        'Compare the Housing and Income dimensions across all countries to see which has more red indicators',
        'Show me a comparison of education indicators between Paraguay and Colombia',
      ],
    },
    global_red_distribution: {
      function: 'stoplight_analytics.get_global_red_distribution',
      params: [
        'start_date',
        'end_date',
        'dimensions',
        'country_filter',
        'filter_type',
      ],
      description: 'View distribution of red indicators globally',
      examples: [
        'Show me how many families have improved from red to green on income indicators across all countries in the last 6 months',
        'What are the most resistant indicators that stay red even after follow-up surveys?',
        'What are the most common red indicators globally?',
      ],
    },
    program_effectiveness: {
      function: 'stoplight_analytics.analyze_program_effectiveness',
      params: ['start_date', 'end_date', 'program_types', 'dimensions'],
      description:
        'Analyzes effectiveness of different program types across regions',
      examples: [
        'Which intervention programs are most effective at improving housing indicators?',
        'Compare effectiveness of financial literacy programs across different regions',
        'What program types show the highest success rates globally?',
      ],
    },
  },
};
