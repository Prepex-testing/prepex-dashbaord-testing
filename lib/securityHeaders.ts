/**
 * Launch step 1 (C6/C11, from the ZAP baseline): the admin app sent no security headers. Built from the same
 * NEXT_PUBLIC_* settings the app uses, so each environment allows only its own API and Sentry.
 */
type Env = Partial<Record<string, string | undefined>>;

const origin = (url: string | undefined): string | null => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

export function adminSecurityHeaders(env: Env, isDev = false): { key: string; value: string }[] {
  const api = origin(env.NEXT_PUBLIC_DASHBOARD_API_URL);
  let sentry: string | null = null;
  try {
    sentry = env.NEXT_PUBLIC_SENTRY_DSN ? `https://${new URL(env.NEXT_PUBLIC_SENTRY_DSN).host}` : null;
  } catch {
    sentry = null;
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${["'self'", api, sentry].filter(Boolean).join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev || api?.startsWith("http:") ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    // the admin app must never be indexed (the HTML already has <meta name="robots" content="noindex">)
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
}
