import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

// Define paths that require authentication
export const config = {
  // Include specific API routes that need authentication
  matcher: [
    '/',
    '/:id',
    '/api/chat/:path*',
    '/api/vote/:path*',
    '/api/messages/:path*',
    '/login',
    '/register',
  ],
};
