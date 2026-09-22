/**
 * Carries the verified password reset between the OTP screen and the
 * new-password screen.
 *
 * The token is held in sessionStorage rather than passed as a query
 * parameter: it authorises a password change, and a URL ends up in browser
 * history, in the referrer of anything the page loads, and in whatever the
 * admin pastes into a chat. sessionStorage also drops it when the tab closes,
 * which suits a credential that's good for 15 minutes.
 */

const STORAGE_KEY = "prepex-admin-password-reset";

export type PendingReset = {
  email: string;
  resetToken: string;
};

export function savePendingReset(reset: PendingReset) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  } catch {
    // Storage unavailable — the reset screen will send the admin back to the
    // start rather than submitting a token it doesn't have.
  }
}

export function readPendingReset(): PendingReset | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingReset>;
    if (typeof parsed?.resetToken !== "string" || !parsed.resetToken) return null;
    return { email: parsed.email ?? "", resetToken: parsed.resetToken };
  } catch {
    return null;
  }
}

export function clearPendingReset() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
}
