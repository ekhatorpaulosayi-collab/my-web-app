import { useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Dashboard } from '../components/Dashboard';
import AIChatWidget from '../components/AIChatWidget';

const noop = () => {};

/**
 * DEV-only phone shell. The owner dashboard needs a signed-in merchant,
 * so this route renders the same tab bar, More menu, and help button
 * with empty books. It is not linked from the product.
 */
export function DevPhoneNavPreview({ openMore = false }: { openMore?: boolean }) {
  useEffect(() => {
    if (!openMore) return;
    const timer = window.setInterval(() => {
      if (document.querySelector('dialog.more-menu')) {
        window.clearInterval(timer);
        return;
      }
      window.dispatchEvent(new CustomEvent('storehouse:open-more'));
    }, 200);
    return () => window.clearInterval(timer);
  }, [openMore]);

  return (
    <AppShell>
      <Dashboard
        sales={[]}
        items={[]}
        credits={[]}
        customers={[]}
        onRecordSale={noop}
        onAddItem={noop}
        onViewHistory={noop}
        onManageCredits={noop}
        onViewLowStock={noop}
        onViewMoney={noop}
        onViewExpenses={noop}
        onViewSettings={noop}
      />
      <AIChatWidget contextType="onboarding" persistentBubble />
    </AppShell>
  );
}
