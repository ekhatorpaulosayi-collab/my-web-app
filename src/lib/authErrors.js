/**
 * Pure auth-error copy. Wrong password and unknown email share one sentence
 * so the login form does not reveal which one failed.
 */
export function friendlyAuthError(error) {
  const code = String(error?.code || error?.error_code || '').toLowerCase();
  const raw = String(error?.message || '');
  const lower = raw.toLowerCase();

  // Already the public sentence. A second format must not turn it into
  // "Something went wrong".
  if (raw === 'Email or password is incorrect') return raw;

  const credentialFailure =
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    code === 'user_not_found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email' ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password') ||
    lower.includes('user not found') ||
    lower.includes('no account found');

  if (credentialFailure) {
    return 'Email or password is incorrect';
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  const errorMessages = {
    'User already registered': 'This email is already registered. Please log in instead.',
    'Invalid email': 'Please enter a valid email address.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Network request failed': 'Network error. Please check your connection.',
    'Failed to fetch': 'Network error. Please check your connection and try again.',
    'rate limit': 'Too many attempts. Please wait a few minutes and try again.',
    'For security purposes, you can only request this after': 'Please wait a minute before trying again.',
    'Password should contain': 'Password is too weak. Use at least 8 characters with letters and numbers.',
    'Password should be at least': 'Password must be at least 8 characters long.',
    'weak_password': 'Password is too weak. Use at least 8 characters with letters and numbers.',
    'Signups not allowed': 'Sign-ups are temporarily closed. Please contact support@storehouse.ng.',
    'Database error saving new user': 'We could not create your account right now. Please try again in a minute.',
  };

  const keys = Object.keys(errorMessages).sort((a, b) => b.length - a.length);
  const message = keys.find((key) => lower.includes(key.toLowerCase()) || code === key.toLowerCase());
  return message ? errorMessages[message] : 'Something went wrong. Please try again.';
}
