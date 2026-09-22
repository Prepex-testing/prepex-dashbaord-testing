import {
  adminRequest,
  publicRequest,
  publicMessageRequest,
} from "@/lib/api/adminRequest";
import type { AdminTokens, AdminUser } from "@/lib/auth/adminSession";

/** POST /admin/login */
export async function login(email: string, password: string) {
  return publicRequest<{ admin: AdminUser; tokens: AdminTokens }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /admin/logout — revokes the refresh token server-side. */
export async function logout(refreshToken: string) {
  return adminRequest<never>("/admin/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

/** GET /admin/me */
export async function getProfile() {
  return adminRequest<AdminUser>("/admin/me");
}

// ---------------------------------------------------------------------------
// Signed-out password reset: email -> code -> new password
// ---------------------------------------------------------------------------

/**
 * POST /admin/forgot-password
 *
 * Succeeds whether or not the address belongs to an admin, so the screen must
 * not treat success as confirmation that the account exists.
 */
export async function forgotPassword(email: string) {
  return publicMessageRequest("/admin/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resendResetOtp(email: string) {
  return publicMessageRequest("/admin/forgot-password/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** POST /admin/verify-reset-otp — returns the single-use token the reset spends. */
export async function verifyResetOtp(email: string, otp: string) {
  return publicRequest<{ resetToken: string; email: string }>("/admin/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

/** POST /admin/reset-password */
export async function resetPassword(resetToken: string, newPassword: string) {
  return publicMessageRequest("/admin/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}

// ---------------------------------------------------------------------------
// Signed-in password change: password pair -> code -> applied
// ---------------------------------------------------------------------------

/** Checks the current password and emails a code. Nothing changes yet. */
export async function requestPasswordChange(currentPassword: string, newPassword: string) {
  return adminRequest<never>("/admin/change-password/request", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function resendPasswordChangeOtp() {
  return adminRequest<never>("/admin/change-password/resend-otp", { method: "POST" });
}

/** Applies the change. Every session is revoked, so the admin must sign in again. */
export async function confirmPasswordChange(otp: string) {
  return adminRequest<never>("/admin/change-password/confirm", {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
}
