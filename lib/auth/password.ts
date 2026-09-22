/**
 * One rule set shared by the reset-password and change-password screens, so
 * the two never disagree about what counts as a valid password.
 *
 * Returns the message to show, or `null` when the pair is acceptable.
 */
export function validateNewPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}
