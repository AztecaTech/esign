import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

/**
 * Origins allowed for auth API (CSRF / cookie flows). Browsers send `Origin` on POSTs.
 * For local Docker/dev, users often open either localhost or 127.0.0.1 while env uses the other.
 */
export const getValidAuthOrigins = (): string[] => {
  const base = new URL(NEXT_PUBLIC_WEBAPP_URL());
  const origins = [base.origin];
  const host = base.hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1') {
    const sibling = new URL(base.href);
    sibling.hostname = host === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.push(sibling.origin);
  }

  return origins;
};
