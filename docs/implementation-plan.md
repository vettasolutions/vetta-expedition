# Poverty Stoplight MCP POC Implementation Plan

This document outlines the specific steps to adapt the existing codebase for the Poverty Stoplight MCP POC, including what files need to be created or modified.

## 1. Environment Configuration

### Modify `.env.example`

Add AWS Postgres connection variables:

```
# AWS Postgres Connection
POSTGRES_HOST=your-psp-db.cluster-xyz.region.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=postgres
POSTGRES_SSL=true
```

## 2. Database Connection

### Create `utils/db.ts`

Create a new utility for AWS Postgres connection:

```typescript
// utils/db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    pool = new Pool({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        rejectUnauthorized: false
      } : undefined
    });
  }
  return pool;
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
```

## 3. Query Templates

### Create `utils/query-templates.ts`

Define parameterized query templates:

```typescript
// utils/query-templates.ts
export interface QueryTemplate {
  function: string;
  params: string[];
  description: string;
}

export interface QueryTemplates {
  [userType: string]: {
    [queryType: string]: QueryTemplate;
  };
}

export const QUERY_TEMPLATES: QueryTemplates = {
  mentor: {
    similar_families: {
      function: 'stoplight_analytics.find_similar_families',
      params: ['organization_id', 'mentor_id', 'family_id'],
      description: 'Find families with similar needs'
    },
    family_red_indicators: {
      function: 'stoplight_analytics.get_family_red_indicators',
      params: ['organization_id', 'family_id'],
      description: 'Find all red indicators for a specific family'
    }
  },
  organization_head: {
    mentor_performance: {
      function: 'stoplight_analytics.get_mentor_performance',
      params: ['organization_id', 'start_date', 'end_date'],
      description: 'View performance metrics for mentors'
    },
    org_improvement_trends: {
      function: 'stoplight_analytics.get_organization_improvement_trends',
      params: ['organization_id', 'start_date', 'end_date'],
      description: 'Analyze improvement trends across the organization'
    }
  },
  psp_head: {
    country_comparison: {
      function: 'stoplight_analytics.compare_countries',
      params: ['indicator_ids', 'start_date', 'end_date'],
      description: 'Compare indicators across different countries'
    },
    global_red_distribution: {
      function: 'stoplight_analytics.get_global_red_distribution',
      params: ['start_date', 'end_date'],
      description: 'View distribution of red indicators globally'
    }
  }
};
```

## 4. NLP Query Matcher

### Create `utils/nlp-simulator.ts`

Implement simulated NLP matching:

```typescript
// utils/nlp-simulator.ts
import { QUERY_TEMPLATES } from './query-templates';

interface MatchResult {
  queryType: string;
  params: Record<string, any>;
}

export function matchQuery(query: string, userType: string): MatchResult | null {
  const lowerQuery = query.toLowerCase();
  
  // Mentor patterns
  if (userType === 'mentor') {
    // Similar families pattern
    if (/similar (needs|families|indicators|problems)/i.test(lowerQuery)) {
      const familyIdMatch = lowerQuery.match(/family (?:id)? ?(\d+)|family (?:named|called) ["']?([^"']+)["']?/i);
      let familyId = 1; // Default for POC
      
      if (familyIdMatch) {
        familyId = familyIdMatch[1] ? parseInt(familyIdMatch[1], 10) : familyIdMatch[2];
      }
      
      return {
        queryType: 'similar_families',
        params: { family_id: familyId }
      };
    }
    
    // Add other pattern matches...
  }
  
  // Add patterns for other user types...
  
  return null;
}
```

## 5. API Route for Query Processing

### Create `app/api/query/route.ts`

Create the API endpoint for processing queries:

```typescript
// app/api/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/utils/db';
import { matchQuery } from '@/utils/nlp-simulator';
import { QUERY_TEMPLATES } from '@/utils/query-templates';

export async function POST(req: NextRequest) {
  try {
    const { query, userType, organizationId = 1, userId = 1 } = await req.json();
    
    // 1. Match query to template using our NLP simulator
    const matchResult = matchQuery(query, userType);
    
    if (!matchResult) {
      return NextResponse.json(
        { error: 'Could not determine query type from your question.' },
        { status: 400 }
      );
    }
    
    const { queryType, params } = matchResult;
    
    // 2. Get the template
    const template = QUERY_TEMPLATES[userType]?.[queryType];
    
    if (!template) {
      return NextResponse.json(
        { error: 'Query template not found' },
        { status: 400 }
      );
    }
    
    // 3. Add default params
    const enrichedParams = {
      organization_id: organizationId,
      mentor_id: userId,
      ...params
    };
    
    // 4. Build the function call
    const paramValues = template.params.map(param => enrichedParams[param] ?? null);
    const fnCall = `SELECT * FROM ${template.function}(${template.params.map((_, i) => `$${i + 1}`).join(', ')})`;
    
    // 5. Execute the query
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      console.log(`Executing: ${fnCall} with params:`, paramValues);
      const result = await client.query(fnCall, paramValues);
      
      return NextResponse.json({ 
        data: result.rows,
        meta: {
          queryType,
          description: template.description,
          paramValues
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Query execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
```

## 6. UI Components

### Create Components for User Interface

Create these new components:

1. **UserSelector.tsx** - For selecting the user role
2. **QueryInput.tsx** - For entering natural language queries
3. **ResultsDisplay.tsx** - For displaying query results with visualization options

### Create New Page

Create a new page for the Poverty Stoplight interface:

```typescript
// app/poverty-stoplight/page.tsx
'use client';
import { useState } from 'react';
import UserSelector from '@/components/UserSelector';
import QueryInput from '@/components/QueryInput';
import ResultsDisplay from '@/components/ResultsDisplay';

export default function Home() {
  const [userType, setUserType] = useState('mentor');
  const [results, setResults] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  
  // For POC, hardcode organization ID
  const organizationId = 1;
  const userId = 1;
  
  const handleQuery = async (query: string) => {
    // Handle query submission to API
  };
  
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Poverty Stoplight MCP POC</h1>
          <p className="text-gray-600 mb-4">
            This proof-of-concept demonstrates the Managed Code Platform architecture
            for querying Poverty Stoplight data with natural language.
          </p>
          
          <UserSelector 
            currentUserType={userType}
            onUserTypeChange={setUserType}
          />
          
          <div className="mt-6">
            <QueryInput 
              onSubmit={handleQuery} 
              isDisabled={isLoading} 
              userType={userType}
            />
          </div>
        </div>
        
        {/* Loading, error, and results display */}
      </div>
    </main>
  );
}
```

## 7. Package Dependencies

Update `package.json` with additional dependencies:

```json
{
  "dependencies": {
    // ... existing dependencies
    "pg": "^8.11.3",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    // ... existing dev dependencies
    "@types/pg": "^8.10.9"
  }
}
```

## 8. Integration with Current Codebase

### Reuse Existing Components

We can reuse or adapt these existing components:

- Chat input component for query input
- Markdown display for results
- Authentication system
- Database utilities

### Leverage Existing AI Integration

We'll adapt the existing AI integration to work with our NLP simulation and eventually with full OpenAI integration.

## Next Steps After POC

1. Create real database functions in AWS Postgres
2. Refine NLP matching with actual OpenAI integration
3. Implement proper authentication with role-based access
4. Add caching and performance optimization
5. Create custom dashboards for frequent queries 