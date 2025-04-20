# Poverty Stoplight MCP POC Adaptation Roadmap

This document compares what exists in the current codebase and what needs to be created or modified to implement the Poverty Stoplight MCP POC using **LLM function calling (tool use)**. The target architecture involves a **Next.js frontend, Supabase Edge Functions, and an AWS Postgres backend with callable functions.**

## Database Connectivity

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Uses `drizzle-orm` with Postgres | Indirect connection via Supabase Edge Functions calling AWS Functions | Define AWS backend function interfaces |
| Schema defined in `lib/db/schema.ts` | MCPs defined as specific, callable functions on AWS | Implement backend functions on AWS |
| Queries in `lib/db/queries.ts` | MCPs defined as LLM tools/functions (schema for LLM) | Define MCP tool schemas for the chosen LLM |

## UI Components

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| ChatUI with message thread | Retain/Enhance existing ChatUI | Adapt ChatUI to handle LLM interaction flow (tool calls, structured results) |
| No role selection | Role-based query access (mentor, org head, PSP head) | Create/Integrate `UserSelector` component/logic |
| Message history | Query history (optional) | Adapt if needed |
| No data visualization | Charts and tables for structured results | Integrate `recharts` for visualizations within ChatUI message display |
| Standard API calls | LLM SDK Integration | Integrate LLM SDK (e.g., Vercel AI SDK) for managing calls and tool use |

## NLP Processing

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Advanced AI chat integration | External LLM integration for NLP and tool use | Integrate with chosen LLM provider API |
| Chat history and context | LLM handles context and tool selection | Ensure context is passed correctly to LLM |
| OpenAI integration (example) | LLM function calling / tool use | Implement frontend logic to handle tool call requests from LLM |
| (Potentially) `nlp-simulator.ts` | Not needed | Remove `nlp-simulator.ts` if it exists |

## API Routes / Backend

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| `/api/chat` endpoint | Backend endpoints (Supabase Edge Functions or Next.js API) for executing MCP tool calls | Create secure backend endpoints corresponding to each MCP tool |
| Stream processing for chat | Endpoints receive structured tool calls, validate, call AWS, return data | Implement validation and AWS function invocation logic |
| Auth middleware | Full auth integrated with role | Ensure backend endpoints validate user role and permissions for MCP calls |

## Authentication

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Full auth system | Use existing auth system | Retain current system |
| User profiles | Basic user type selection integrated with Auth | Integrate `UserSelector` logic with user session/authentication |

## Dependencies

| Current Codebase | Poverty Stoplight POC Needs | Action Required |
|------------------|----------------------------|----------------|
| Next.js, React, TypeScript | Same stack | Reuse |
| Tailwind CSS | Same styling | Reuse |
| `drizzle-orm` | Likely not needed in Next.js app | Remove if unused |
| No charting library | `recharts` for visualizations | Add `recharts` dependency |
| (None specific) | LLM SDK (e.g., `ai` package) | Add relevant LLM SDK dependency |

## Implementation Priority Order

1.  **Define MCPs as Tools:** Create the JSON schemas describing each MCP function (e.g., Improvement Tracker, Country Comparison) for the LLM.
2.  **Define/Implement AWS Backend Functions:** Create the actual functions on the AWS server that perform the database operations for each MCP.
3.  **Build Backend Endpoints:** Create the initial secure endpoints (Supabase Edge Functions or Next.js API routes) that receive structured tool calls, validate permissions, and invoke the corresponding AWS functions.
4.  **Integrate LLM SDK into Frontend:** Add the chosen LLM SDK (e.g., Vercel AI SDK) to the Next.js app.
5.  **Implement User Role Selection & Auth Integration:** Create/integrate the `UserSelector` and ensure the user's role is available for LLM calls and backend validation.
6.  **Adapt ChatUI for LLM Interaction:** Modify the frontend ChatUI component:
    *   Send user queries and available MCP tool schemas (based on role) to the LLM.
    *   Handle LLM responses (text or tool call requests).
    *   If a tool call is requested, trigger the corresponding backend endpoint.
    *   Display results received from the backend.
7.  **Integrate Visualizations:** Use `recharts` or similar to render charts/tables within the ChatUI for structured data results.
8.  **Testing:** Perform end-to-end testing of the LLM interaction, tool execution, and result display.

## Reusable Elements from Current Codebase

1.  **Project Structure** - Next.js App Router setup
2.  **UI Components** - Base ChatUI structure, other generic components
3.  **Styling** - Tailwind CSS configuration
4.  **Auth** - Full authentication system foundations
5.  **Error Handling** - Error handling patterns (adapt as needed)

## New Elements to Create

1.  **MCP Tool Definitions:** Schemas for the LLM.
2.  **AWS Backend Functions:** Implementations for each MCP.
3.  **Backend MCP Endpoints:** Secure endpoints (Edge Functions/API routes) to execute MCPs.
4.  **LLM Integration Logic:** Frontend code to manage LLM calls and tool use.
5.  **Enhanced ChatUI Rendering:** Components for displaying structured data/visualizations.
6.  **User Role Integration:** `UserSelector` component and integration with auth/context.
7.  **Visualization Components:** Specific charts/tables using `recharts`. 