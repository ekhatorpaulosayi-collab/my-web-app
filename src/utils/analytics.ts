/**
 * Analytics event logging for sales
 * No external dependencies - uses console and extensible for future integrations
 */

export type SaleEvent = 'sale_started' | 'sale_completed' | 'sale_failed';

export interface SaleEventData {
  item_count?: number;
  amount?: number;
  payment_method?: string;
  is_credit?: boolean;
  error?: string;
  item_id?: string;
}

export const logSaleEvent = (event: SaleEvent, data?: SaleEventData): void => {
  try {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };

    console.info(`[Analytics] ${event}`, payload);

    // Hook for future analytics integrations (GA, Mixpanel, etc.)
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.gtag) {
        w.gtag('event', event, data);
      }
      if (w.mixpanel) {
        w.mixpanel.track(event, data);
      }
    }
  } catch (err) {
    // Silent fail - don't block sales flow
    console.warn('[Analytics] Failed to log event:', err);
  }
};
