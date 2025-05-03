/**
 * PSP Tool Authentication Helper
 *
 * This module provides authentication support for PSP tools
 * to access authenticated API endpoints.
 */

// Use Node.js protocol for importing process
import { env } from 'node:process';

// PSP API Key for server-side authentication
// This should be set as an environment variable in production
const PSP_API_KEY = env.PSP_API_KEY || 'psp-development-key';

/**
 * Adds authentication headers to a fetch request options object
 *
 * @param options The current fetch options object
 * @returns Updated options with authentication headers
 */
export function addAuthHeaders(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers);

  // Add PSP API key for authentication
  headers.set('x-psp-api-key', PSP_API_KEY);

  return {
    ...options,
    headers,
  };
}

/**
 * Creates a properly authenticated PSP API URL
 *
 * @param path The API path (e.g., '/api/psp/some-endpoint')
 * @param baseUrl Optional base URL
 * @returns Full authenticated URL
 */
export function createPspApiUrl(path: string, baseUrl?: string): string {
  // Get base URL from environment or window location
  const apiBase =
    baseUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

  // Ensure path starts with /api/psp/
  const apiPath = path.startsWith('/api/psp/')
    ? path
    : `/api/psp/${path.replace(/^\/+/, '')}`;

  return `${apiBase}${apiPath}`;
}
