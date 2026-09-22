/**
 * The admin dashboard reads and writes through dashboard-service alone.
 *
 * Student data lives in core-service, but dashboard-service proxies it over
 * the internal service API (see its clients/coreUsers.client.ts), so the
 * browser never needs a second base URL — or a second set of credentials.
 */
export const DASHBOARD_API_BASE_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? "http://localhost:4003";

/** Everything the admin API exposes is mounted under this prefix. */
export const DASHBOARD_API_URL = `${DASHBOARD_API_BASE_URL}/api/dashboard`;
