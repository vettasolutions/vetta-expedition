import { QUERY_TEMPLATES } from './query-templates';

interface MatchResult {
  queryType: string;
  params: Record<string, any>;
}

/**
 * Extract date ranges from natural language queries
 */
function extractDateRange(query: string): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  let startDate = new Date();
  const endDate = new Date();

  // Look for "last X months/weeks/days" pattern
  const lastPeriodMatch = query.match(
    /(last|past) (\d+) (month|months|week|weeks|day|days)/i,
  );
  if (lastPeriodMatch) {
    const amount = parseInt(lastPeriodMatch[2], 10);
    const unit = lastPeriodMatch[3].toLowerCase();

    if (unit.startsWith('month')) {
      startDate.setMonth(startDate.getMonth() - amount);
    } else if (unit.startsWith('week')) {
      startDate.setDate(startDate.getDate() - amount * 7);
    } else if (unit.startsWith('day')) {
      startDate.setDate(startDate.getDate() - amount);
    }
  } else {
    // Default to last 6 months if no specific period
    startDate.setMonth(startDate.getMonth() - 6);
  }

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

/**
 * Extract dimension information from natural language queries
 */
function extractDimensions(query: string): string[] {
  const dimensions: Record<string, string> = {
    health: 'health',
    income: 'income',
    housing: 'housing',
    education: 'education',
    transportation: 'transportation',
    work: 'work',
    services: 'services',
    environment: 'environment',
    social: 'social',
    influence: 'influence',
    community: 'community',
  };

  const foundDimensions: string[] = [];

  Object.keys(dimensions).forEach((dim) => {
    if (new RegExp(`\\b${dim}\\b`, 'i').test(query)) {
      foundDimensions.push(dimensions[dim]);
    }
  });

  return foundDimensions.length > 0 ? foundDimensions : ['all'];
}

/**
 * Extract family information from natural language queries
 */
function extractFamilyInfo(query: string): { family_id: number } {
  // Try to match family ID by number
  const familyIdMatch = query.match(/family (?:id)? ?(\d+)|family #(\d+)/i);
  if (familyIdMatch) {
    const id = familyIdMatch[1] || familyIdMatch[2];
    return { family_id: parseInt(id, 10) };
  }

  // Try to match family by name
  const familyNameMatch = query.match(
    /(?:the )?([A-Za-z]+) family|family (?:named|called) ["']?([^"']+)["']?/i,
  );
  if (familyNameMatch) {
    // In a real system, you would look up the family ID by name
    // For the POC, we'll use a dummy mapping
    const familyName = (familyNameMatch[1] || familyNameMatch[2]).toLowerCase();
    const dummyFamilyMap: Record<string, number> = {
      gonzalez: 1,
      garcia: 2,
      smith: 3,
      johnson: 4,
      lopez: 5,
    };

    return { family_id: dummyFamilyMap[familyName] || 1 };
  }

  // Default family ID if none specified
  return { family_id: 1 };
}

/**
 * Match user query to a query template based on user type and query content
 */
export function matchQuery(
  query: string,
  userType: string,
): MatchResult | null {
  const lowerQuery = query.toLowerCase();

  // PSP Head / Data Team queries
  if (userType === 'psp_head') {
    // Improvement Tracker
    if (
      /improv(ed|ement)|from red to (yellow|green)|chang(ed|e) (color|status)/i.test(
        lowerQuery,
      )
    ) {
      const dateRange = extractDateRange(lowerQuery);
      const dimensions = extractDimensions(lowerQuery);

      // Check for countries
      let countryFilter = 'all';
      if (/across (all )?countries/i.test(lowerQuery)) {
        countryFilter = 'all';
      } else if (/in ([A-Za-z\s]+)/i.test(lowerQuery)) {
        const countryMatch = lowerQuery.match(/in ([A-Za-z\s]+)/i);
        if (countryMatch) countryFilter = countryMatch[1].trim();
      }

      return {
        queryType: 'global_red_distribution',
        params: {
          ...dateRange,
          dimensions: dimensions,
          country_filter: countryFilter,
        },
      };
    }

    // Country Comparison
    if (
      /compar(e|ison) (of |between )?countries|which countries|across countries/i.test(
        lowerQuery,
      )
    ) {
      const dimensions = extractDimensions(lowerQuery);

      // Indicator status filter
      let statusFilter = 'all';
      if (/green indicators/i.test(lowerQuery)) {
        statusFilter = 'green';
      } else if (/yellow indicators/i.test(lowerQuery)) {
        statusFilter = 'yellow';
      } else if (/red indicators/i.test(lowerQuery)) {
        statusFilter = 'red';
      }

      return {
        queryType: 'country_comparison',
        params: {
          indicator_ids: dimensions.map((_, i) => 100 + i), // Dummy IDs for POC
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 6))
            .toISOString()
            .split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          dimensions: dimensions,
          status_filter: statusFilter,
        },
      };
    }

    // Program Effectiveness or Resistant Indicators
    if (
      /resistant|stay (red|yellow|green)|not improv(ed|ing)|effectiveness/i.test(
        lowerQuery,
      )
    ) {
      const dateRange = extractDateRange(lowerQuery);

      return {
        queryType: 'global_red_distribution',
        params: {
          ...dateRange,
          filter_type: 'resistant',
        },
      };
    }

    // Dimension Analysis
    if (
      /dimension (analysis|comparison)|compare .* dimensions/i.test(lowerQuery)
    ) {
      const dimensions = extractDimensions(lowerQuery);

      return {
        queryType: 'country_comparison',
        params: {
          indicator_ids: dimensions.map((_, i) => 100 + i), // Dummy IDs for POC
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 6))
            .toISOString()
            .split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          dimensions: dimensions,
          analysis_type: 'dimension',
        },
      };
    }
  }

  // Organization Head queries
  if (userType === 'organization_head') {
    // Mentor Performance Dashboard
    if (
      /mentor (performance|completed|surveys|efficiency|time)/i.test(lowerQuery)
    ) {
      const dateRange = extractDateRange(lowerQuery);

      return {
        queryType: 'mentor_performance',
        params: {
          ...dateRange,
        },
      };
    }

    // Intervention Effectiveness
    if (
      /intervention|program effective|improv(ed|ing) (after|following)/i.test(
        lowerQuery,
      )
    ) {
      const dateRange = extractDateRange(lowerQuery);

      // Try to extract program type
      let programType = 'all';
      const programMatch = lowerQuery.match(/our ([a-z\s]+) program/i);
      if (programMatch) {
        programType = programMatch[1].trim();
      }

      return {
        queryType: 'org_improvement_trends',
        params: {
          ...dateRange,
          program_type: programType,
        },
      };
    }

    // Resource Allocation Optimizer
    if (
      /resource (allocation|planning)|focus (our )?resources|where (should|to) (we )?(focus|allocate)/i.test(
        lowerQuery,
      )
    ) {
      const dateRange = extractDateRange(lowerQuery);

      return {
        queryType: 'org_improvement_trends',
        params: {
          ...dateRange,
          analysis_type: 'resource_allocation',
        },
      };
    }

    // Organization Benchmarking
    if (
      /benchmark|compar(e|ison) to others|how does our organization compare/i.test(
        lowerQuery,
      )
    ) {
      const dateRange = extractDateRange(lowerQuery);
      const dimensions = extractDimensions(lowerQuery);

      return {
        queryType: 'org_improvement_trends',
        params: {
          ...dateRange,
          dimensions: dimensions,
          analysis_type: 'benchmarking',
        },
      };
    }
  }

  // Mentor / Social Worker queries
  if (userType === 'mentor') {
    // Similar Needs Finder
    if (/similar (needs|families|indicators|problems)/i.test(lowerQuery)) {
      const familyInfo = extractFamilyInfo(lowerQuery);
      const dimensions = extractDimensions(lowerQuery);

      return {
        queryType: 'similar_families',
        params: {
          ...familyInfo,
          dimensions: dimensions,
        },
      };
    }

    // Progress Tracker
    if (/progress|improv(ed|ing)|families who have/i.test(lowerQuery)) {
      const dateRange = extractDateRange(lowerQuery);

      // Extract status change
      let fromStatus = 'all';
      let toStatus = 'all';

      if (/from red to (yellow|green)/i.test(lowerQuery)) {
        const match = lowerQuery.match(/from red to (yellow|green)/i);
        fromStatus = 'red';
        toStatus = match ? match[1].toLowerCase() : 'all';
      }

      return {
        queryType: 'family_red_indicators',
        params: {
          ...dateRange,
          from_status: fromStatus,
          to_status: toStatus,
          track_progress: true,
        },
      };
    }

    // Intervention Recommender
    if (
      /intervention|recommend|what (has|have) worked|best for families/i.test(
        lowerQuery,
      )
    ) {
      const familyInfo = extractFamilyInfo(lowerQuery);
      const dimensions = extractDimensions(lowerQuery);

      return {
        queryType: 'similar_families',
        params: {
          ...familyInfo,
          dimensions: dimensions,
          recommendation_type: 'intervention',
        },
      };
    }

    // Survey Time Optimizer
    if (
      /survey time|longest time|time to complete|survey efficiency/i.test(
        lowerQuery,
      )
    ) {
      return {
        queryType: 'family_red_indicators',
        params: {
          analysis_type: 'survey_time',
        },
      };
    }

    // Generic red indicators query
    if (/red indicators|indicators (that are|in) red/i.test(lowerQuery)) {
      const familyInfo = extractFamilyInfo(lowerQuery);

      return {
        queryType: 'family_red_indicators',
        params: {
          ...familyInfo,
        },
      };
    }
  }

  return null;
}
