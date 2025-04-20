# Building a Poverty Stoplight MCP POC Locally

This guide walks through creating a proof-of-concept (POC) implementation of the Managed Code Platform (MCP) architecture for Poverty Stoplight. The application will run locally but connect to your live AWS Postgres database.

## Prerequisites

- Node.js (v16+) and npm
- Access to your AWS Postgres instance
- Basic knowledge of TypeScript, React, and Next.js

## Project Objectives

The Poverty Stoplight MCP POC aims to create a natural language interface to query a database containing poverty-related data. Users of different roles can ask questions in plain language, which will be processed by the system to execute appropriate queries against the database.

### Key Components Already Available in Current Codebase

- **Next.js Framework**: The repo already has Next.js with App Router, TypeScript, and Tailwind CSS set up
- **Chat Interface**: Existing chat components that can be adapted for NL queries
- **Database Connectivity**: Database utilities that can be modified to connect to AWS Postgres
- **AI Integration**: Integration with AI providers for natural language processing

### Components to Be Implemented

- **Database Connection to AWS Postgres**: Connect to the live AWS Postgres instance
- **Query Templates**: Implement parameterized query templates for different user types
- **NLP Query Matching**: Create a system to match natural language queries to database functions
- **Role-based Access**: Implement different query templates based on user roles (mentor, organization head, PSP head)
- **Visualization Components**: Add visualization options for query results

## Implementation Steps

1. Configure environment variables for AWS Postgres connection
2. Create database connection utility for AWS Postgres
3. Define parameterized query templates for different user types
4. Implement NLP matcher to translate natural language to specific queries
5. Create API route for query processing
6. Build UI components for user selection, query input, and results display
7. Add visualization options for different types of results

## Security Considerations

- Create a database user with restricted permissions
- Implement proper authentication
- Add row-level security based on user roles

## Future Enhancements

1. OpenAI Integration for improved NLP
2. Custom dashboards for frequently accessed queries
3. Caching for frequently executed queries
4. Advanced user management and permissions 