/**
 * already_registered, and HTTP 409 from a domain this project already has, are active.
 * domain_already_in_use means another project owns the name: blocked.
 * A fresh registration stays pending until the certificate is confirmed.
 */
export function interpretProvisionResponse(httpStatus, body) {
  const status = body && body.status;
  const code = body && body.error && body.error.code;
  if (status === 'blocked' || code === 'domain_already_in_use') {
    return { state: 'blocked', httpStatus };
  }
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

/** Text shown in Store settings for a saved provisioning row. */
export function provisioningReaderText(status) {
  if (!status || status === 'active') return '';
  if (status === 'blocked') {
    return 'This store link is already used by another site. Choose a different URL.';
  }
  return 'The storehouse.ng link is not confirmed yet. It will be retried on its own. Saving again also retries.';
}
