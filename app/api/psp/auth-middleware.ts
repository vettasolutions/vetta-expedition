/**
 * PSP API Authentication Middleware
 *
 * This middleware handles authentication for PSP API routes.
 * It checks for a valid API key or user session.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { env } from 'node:process';

// PSP API Key for server-side authentication (should match the one in lib/ai/tools/psp/auth.ts)
const PSP_API_KEY = env.PSP_API_KEY || 'psp-development-key';

/**
 * Middleware to check authentication for PSP API routes
 *
 * Validates either:
 * 1. A valid PSP API key in the request headers
 * 2. A valid user session
 *
 * @param request The incoming request
 * @returns Response or null to continue
 */
export async function pspAuthMiddleware(request: Request) {
  // First check for API key authentication
  const apiKey = request.headers.get('x-psp-api-key');

  if (apiKey === PSP_API_KEY) {
    // API key is valid, allow the request
    return null;
  }

  // If no API key, check for user session
  const session = await auth();

  if (session) {
    // User is authenticated, allow the request
    return null;
  }

  // Neither API key nor session is valid, return unauthorized
  return NextResponse.json(
    { error: true, message: 'Unauthorized: Authentication required' },
    { status: 401 },
  );
}
