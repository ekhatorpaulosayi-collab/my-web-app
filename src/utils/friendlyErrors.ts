/**
 * Friendly Error Messages
 *
 * Convert technical errors into user-friendly messages
 */

export interface FriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  icon: string;
}

/**
 * Convert error to friendly message
 */
export function getFriendlyError(error: any): FriendlyError {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  // Firebase authentication errors
  if (errorCode.includes('auth/')) {
    return getAuthError(errorCode);
  }

  // Firebase firestore errors
  if (errorCode.includes('permission-denied')) {
    return {
      title: 'Permission Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestion: 'Try logging out and back in. If the problem persists, contact support.',
      icon: '🔒',
    };
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('offline')) {
    return {
      title: 'No Internet Connection',
      message: 'Please check your internet connection and try again.',
      suggestion: 'Make sure you\'re connected to WiFi or mobile data.',
      icon: '📡',
    };
  }

  // File upload errors
  if (errorMessage.includes('file') || errorMessage.includes('upload')) {
    return {
      title: 'Upload Failed',
      message: 'Failed to upload the file.',
      suggestion: 'Make sure the file is less than 2MB and try again.',
      icon: '📁',
    };
  }

  // Validation errors
  if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
    return {
      title: 'Invalid Input',
      message: 'Some of the information you entered is not valid.',
      suggestion: 'Please check your inputs and try again.',
      icon: '⚠️',
    };
  }

  // Duplicate/already exists errors
  if (errorMessage.includes('already') || errorMessage.includes('exists') || errorMessage.includes('duplicate')) {
    return {
      title: 'Already Exists',
      message: 'This item already exists.',
      suggestion: 'Try using a different name or identifier.',
      icon: '🔄',
    };
  }

  // Default generic error
  return {
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem continues, contact support.',
    icon: '❌',
  };
}

/**
 * Get friendly auth error message
 */
function getAuthError(code: string): FriendlyError {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return {
        title: 'Login Failed',
        message: 'The email or password you entered is incorrect.',
        suggestion: 'Please check your credentials and try again.',
        icon: '🔑',
      };

    case 'auth/email-already-in-use':
      return {
        title: 'Email Already Registered',
        message: 'An account with this email already exists.',
        suggestion: 'Try logging in instead, or use a different email.',
        icon: '📧',
      };

    case 'auth/weak-password':
      return {
        title: 'Weak Password',
        message: 'Your password is too weak.',
        suggestion: 'Use at least 6 characters with a mix of letters and numbers.',
        icon: '🔐',
      };

    case 'auth/invalid-email':
      return {
        title: 'Invalid Email',
        message: 'The email address is not valid.',
        suggestion: 'Please enter a valid email address.',
        icon: '📧',
      };

    case 'auth/too-many-requests':
      return {
        title: 'Too Many Attempts',
        message: 'Too many failed login attempts.',
        suggestion: 'Please wait a few minutes and try again.',
        icon: '⏱️',
      };

    case 'auth/network-request-failed':
      return {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        suggestion: 'Check your internet connection and try again.',
        icon: '📡',
      };

    default:
      return {
        title: 'Authentication Error',
        message: 'There was a problem with authentication.',
        suggestion: 'Please try again or contact support.',
        icon: '🔒',
      };
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: any): string {
  const friendly = getFriendlyError(error);

  let message = `${friendly.icon} ${friendly.title}\n\n${friendly.message}`;

  if (friendly.suggestion) {
    message += `\n\n💡 ${friendly.suggestion}`;
  }

  return message;
}

/**
 * Show friendly error alert
 */
export function showFriendlyError(error: any): void {
  const message = formatErrorForDisplay(error);
  alert(message);
}
