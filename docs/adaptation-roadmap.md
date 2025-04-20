# Poverty Stoplight MCP POC Adaptation Roadmap

This document compares what exists in the current codebase and what needs to be created or modified to implement the Poverty Stoplight MCP POC.

## Database Connectivity

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Uses `drizzle-orm` with Postgres | Direct connection to AWS Postgres | Create new utils/db.ts file with pg Pool |
| Schema defined in `lib/db/schema.ts` | No schema definition needed (using function calls) | None - we'll call functions directly |
| Queries in `lib/db/queries.ts` | Custom query builder for function calls | Create new query utility |

## UI Components

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| ChatUI with message thread | Simple query interface with results display | Create new query UI |
| No role selection | Role-based query access (mentor, org head, PSP head) | Create UserSelector component |
| Message history | Query history (optional) | Adapt if needed |
| No data visualization | Charts and tables for query results | Create ResultsDisplay component with visualizations |

## NLP Processing

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Advanced AI chat integration | Simple NLP simulator for query matching | Create nlp-simulator.ts |
| Chat history and context | Single-turn query processing | Simplified API |
| OpenAI integration | Pattern matching (initially) | Create pattern matchers |

## API Routes

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| `/api/chat` endpoint | `/api/query` endpoint | Create new route |
| Stream processing for chat | Simple JSON response with query results | Create new API handler |
| Auth middleware | Simplified auth | Adapt or simplify |

## Authentication

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Full auth system | Simple role selection (POC) | Use simplified approach for POC |
| User profiles | Basic user type selection | Create UserSelector |

## Dependencies

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Next.js, React, TypeScript | Same stack | Reuse |
| Tailwind CSS | Same styling | Reuse |
| `drizzle-orm` | `pg` direct connection | Add pg dependency |
| No charting library | `recharts` for visualizations | Add recharts dependency |

## Implementation Priority Order

1. **Database Connection** - Establish connectivity to AWS Postgres
   - Create utils/db.ts
   - Test connection

2. **Query Templates** - Define parameterized queries
   - Create query-templates.ts
   - Define templates for different user types

3. **NLP Simulator** - Create pattern matching for queries
   - Create nlp-simulator.ts
   - Implement pattern matching for each query type

4. **API Endpoint** - Create query processing endpoint
   - Create app/api/query/route.ts
   - Implement query matching and execution

5. **UI Components** - Build the interface
   - Create UserSelector.tsx
   - Create QueryInput.tsx
   - Create ResultsDisplay.tsx with visualization

6. **New Page** - Create the main application page
   - Create app/poverty-stoplight/page.tsx
   - Integrate all components

7. **Testing** - Validate the implementation
   - Test with mock queries
   - Verify visualizations

## Reusable Elements from Current Codebase

1. **Project Structure** - Next.js App Router setup
2. **UI Components** - Some generic UI components can be reused
3. **Styling** - Tailwind CSS configuration
4. **Auth** - Basic auth patterns (simplified for POC)
5. **Error Handling** - Error handling patterns

## New Elements to Create

1. **AWS Postgres Connection** - Direct pg connection
2. **Query Templates** - Parameterized function calls
3. **NLP Matcher** - Pattern matching for queries
4. **User Role Selection** - Interface for selecting user role
5. **Query Input** - Natural language query interface
6. **Visualization** - Charts and tables for query results 