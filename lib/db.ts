import { Pool } from 'pg';

// Create singleton database connection pools
let pspPool: Pool | null = null;
let authPool: Pool | null = null;

// Pool for PSP data (AWS PostgreSQL)
export function getPSPPool(): Pool {
  if (!pspPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    pspPool = new Pool({
      connectionString,
      // Setting a reasonable limit of max connections
      max: 20,
      // Add SSL configuration if required (needed for AWS RDS)
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    });

    // Log when pool connects or errors
    pspPool.on('error', (err) => {
      console.error('Unexpected error on idle PSP PostgreSQL client', err);
      process.exit(-1);
    });

    console.log('PSP PostgreSQL connection pool created');
  }

  return pspPool;
}

// Pool for authentication/user data (Neon PostgreSQL)
export function getAuthPool(): Pool {
  if (!authPool) {
    const connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not defined');
    }

    authPool = new Pool({
      connectionString,
      max: 20,
      // Neon typically requires SSL
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Log when pool connects or errors
    authPool.on('error', (err) => {
      console.error('Unexpected error on idle Auth PostgreSQL client', err);
      process.exit(-1);
    });

    console.log('Auth PostgreSQL connection pool created');
  }

  return authPool;
}

// Query PSP database (AWS PostgreSQL)
export async function queryPSP(text: string, params?: any[]) {
  const client = await getPSPPool().connect();

  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Query Auth database (Neon PostgreSQL)
export async function queryAuth(text: string, params?: any[]) {
  const client = await getAuthPool().connect();

  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// For backward compatibility with existing code
export const query = queryPSP;
export function getPool(): Pool {
  return getPSPPool();
}

// Utility function to handle API errors consistently
export function handleApiError(error: unknown) {
  console.error('Database error:', error);

  if (error instanceof Error) {
    return {
      error: true,
      message: `Database error: ${error.message}`,
    };
  }

  return {
    error: true,
    message: 'Unknown database error occurred',
  };
}
