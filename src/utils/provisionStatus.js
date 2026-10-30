/** A 2xx response is pending unless the function explicitly says the domain is active. */
export function interpretProvisionResponse(httpStatus, body) {
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 409 || httpStatus === 429 || httpStatus >= 500 || httpStatus === 0) {
    return { state: 'retryable_failure', httpStatus };
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return { state: 'retryable_failure', httpStatus };
  }
  if (body && body.status === 'active') return { state: 'active', httpStatus };
  return { state: 'pending', httpStatus };
}
