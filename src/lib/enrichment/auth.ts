import { NextRequest } from 'next/server';

export function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured — cron endpoints are unprotected');
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}
