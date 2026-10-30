/**
 * already_registered, and HTTP 409 from a domain that already exists, are active.
 * A fresh registration stays pending until the certificate is confirmed.
 */
export function interpretProvisionResponse(httpStatus, body) {
  const status = body && body.status;
  if (status === 'active' || status === 'already_registered' || httpStatus === 409) {
    return { state: 'active', httpStatus };
  }
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || httpStatus >= 500 || httpStatus === 0) {
    return { state: 'retryable_failure', httpStatus };
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return { state: 'retryable_failure', httpStatus };
  }
  return { state: 'pending', httpStatus };
}
