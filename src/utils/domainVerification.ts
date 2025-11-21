/**
 * Domain Verification Utilities
 * Helps users set up custom domains for their storefronts
 */

/**
 * Validate domain format
 */
export function validateDomainFormat(domain: string): { valid: boolean; error?: string } {
  if (!domain || domain.trim() === '') {
    return { valid: true }; // Empty is OK (optional field)
  }

  const trimmed = domain.trim().toLowerCase();

  // Check for valid characters
  if (!/^[a-z0-9.-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Domain can only contain letters, numbers, dots, and hyphens'
    };
  }

  // Check for valid TLD
  if (!trimmed.includes('.')) {
    return {
      valid: false,
      error: 'Domain must include a top-level domain (e.g., .com, .ng)'
    };
  }

  // Check length
  if (trimmed.length > 253) {
    return {
      valid: false,
      error: 'Domain name is too long (max 253 characters)'
    };
  }

  // Check for protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      valid: false,
      error: 'Do not include http:// or https:// - just the domain name'
    };
  }

  // Check for paths
  if (trimmed.includes('/')) {
    return {
      valid: false,
      error: 'Do not include paths - just the domain name'
    };
  }

  return { valid: true };
}

/**
 * Generate DNS instructions for custom domain setup
 */
export function generateDNSInstructions(customDomain: string, targetSubdomain: string) {
  const isApexDomain = customDomain.split('.').length === 2; // e.g., "example.com"
  const isWwwDomain = customDomain.startsWith('www.'); // e.g., "www.example.com"

  return {
    recordType: 'CNAME',
    name: isApexDomain ? '@' : isWwwDomain ? 'www' : customDomain.split('.')[0],
    value: `${targetSubdomain}.storehouse.app`,
    ttl: '3600',
    note: isApexDomain
      ? 'Some DNS providers do not support CNAME for apex domains (@). You may need to use an ALIAS or ANAME record instead, or add "www" to your domain.'
      : 'This CNAME record will redirect your custom domain to your Storehouse subdomain.',
  };
}

/**
 * Estimate DNS propagation time
 */
export function getDNSPropagationEstimate(): string {
  return 'DNS changes typically take 1-24 hours to propagate globally. In most cases, your domain will be active within 1-2 hours.';
}

/**
 * Normalize custom domain input
 */
export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/\/$/, ''); // Remove trailing slash
}
