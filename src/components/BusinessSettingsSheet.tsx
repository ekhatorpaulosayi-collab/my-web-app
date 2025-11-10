import React, { useMemo, useState } from "react";
import {
  loadSettings, saveSettings, settingsEqual, type Settings
} from "../state/settingsSchema";

type Props = {
  onClose: () => void;
  // Legacy props (kept for backward compatibility)
  onExportCSV?: () => void;
  onSendEOD?: () => void;
  onViewPlans?: () => void;
  isBetaTester?: boolean;
  onToggleBeta?: (value: boolean) => void;
  currentPlan?: string;
  itemCount?: number;
  onToast?: (message: string) => void;
};

export default function BusinessSettingsSheet({
  onClose,
  onExportCSV,
  onSendEOD,
  onViewPlans,
  isBetaTester,
  onToggleBeta,
  currentPlan,
  itemCount,
  onToast
}: Props) {
  const persisted = loadSettings();
  const [draft, setDraft] = useState<Settings>(persisted);
  const [saving, setSaving] = useState(false);

  const isValid = useMemo(() => {
    if ((draft.receiptMessage?.length ?? 0) > 160) return false;
    return true;
  }, [draft]);

  const isDirty = useMemo(() => !settingsEqual(draft, persisted), [draft, persisted]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  async function onSave() {
    try {
      setSaving(true);
      const normalized: Settings = {
        ...draft,
        businessName: (draft.businessName || "").trim(),
        ownerName: (draft.ownerName || "").trim(),
        businessPhone: (draft.businessPhone || "").trim(),
        receiptMessage: (draft.receiptMessage || "").trim(),
      };
      saveSettings(normalized);
      setSaving(false);
      if (onToast) onToast("Settings saved successfully");
      onClose();
    } catch (e) {
      console.error(e);
      setSaving(false);
      if (onToast) onToast("Failed to save settings");
    }
  }

  return (
    <div className="settings-modal">
      <div className="settings-header">
        <h2>Business Settings</h2>
        <button className="settings-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="settings-form">
        {/* PROFILE */}
        <div className="settings-group">
          <label>
            Business Name *
            <span className="char-count">{(draft.businessName?.length ?? 0)}/50</span>
          </label>
          <input
            className="settings-input"
            type="text"
            value={draft.businessName ?? ""}
            onChange={(e) => update("businessName", e.target.value)}
            placeholder="e.g., Paulo Enterprise"
            maxLength={50}
          />
        </div>

        <div className="settings-group">
          <label>Owner Name</label>
          <input
            className="settings-input"
            type="text"
            value={draft.ownerName ?? ""}
            onChange={(e) => update("ownerName", e.target.value)}
            placeholder="e.g., Osayi"
            maxLength={30}
          />
          <span className="char-count">{(draft.ownerName?.length ?? 0)}/30</span>
        </div>

        <div className="settings-group">
          <label>Business Phone</label>
          <input
            className="settings-input"
            type="tel"
            value={draft.businessPhone ?? ""}
            onChange={(e) => update("businessPhone", e.target.value)}
            placeholder="0802… / 081… / 090…"
            maxLength={14}
          />
          <span className="phone-hint">Nigerian format: 080, 081, 090, 070, etc.</span>
        </div>

        {/* RECEIPT MESSAGE */}
        <div className="settings-group">
          <label>
            Receipt Message
            <span className="char-count">{(draft.receiptMessage?.length ?? 0)}/160</span>
          </label>
          <textarea
            className="settings-input"
            value={draft.receiptMessage ?? ""}
            onChange={(e) => update("receiptMessage", e.target.value)}
            placeholder="e.g., Thank you for your patronage"
            maxLength={160}
            rows={3}
          />
        </div>

        {/* RECEIPT PREFERENCES */}
        <div className="settings-group">
          <label>Receipt Preferences</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={draft.autoOfferReceipt}
                onChange={(e) => update("autoOfferReceipt", e.target.checked)}
                style={{ width: 'auto', height: 'auto' }}
              />
              <span style={{ fontWeight: 'normal', fontSize: '14px' }}>
                Offer to send receipt after sale
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none' }}>
              <input
                type="checkbox"
                checked={draft.autoSendReceiptToSavedCustomers}
                onChange={(e) => update("autoSendReceiptToSavedCustomers", e.target.checked)}
                style={{ width: 'auto', height: 'auto' }}
              />
              <span style={{ fontWeight: 'normal', fontSize: '14px' }}>
                Auto-send to saved customers
              </span>
            </label>
          </div>
        </div>

        {/* STOCK DEFAULTS */}
        <div className="settings-group">
          <label>Low Stock Threshold</label>
          <input
            className="settings-input"
            type="number"
            min={0}
            value={draft.lowStockThreshold}
            onChange={(e) => update("lowStockThreshold", Number(e.target.value || 0))}
          />
        </div>

        <div className="settings-group">
          <label>Default History Range</label>
          <select
            className="settings-input"
            value={draft.defaultHistoryRange}
            onChange={(e) => update("defaultHistoryRange", e.target.value as Settings["defaultHistoryRange"])}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* ONLINE STORE HERO */}
        <div className="settings-group">
          <label>Online Store</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none' }}>
            <input
              type="checkbox"
              checked={draft.showOnlineStoreHero}
              onChange={(e) => {
                update("showOnlineStoreHero", e.target.checked);
                if (e.target.checked) {
                  window.dispatchEvent(new Event('show-online-store-hero'));
                }
              }}
              style={{ width: 'auto', height: 'auto' }}
            />
            <span style={{ fontWeight: 'normal', fontSize: '14px' }}>
              Show Online Store banner on dashboard
            </span>
          </label>
        </div>

        {/* DATA & REPORTS */}
        {(onExportCSV || onSendEOD) && (
          <div className="settings-group">
            <label>Data & Reports</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onSendEOD && (
                <button
                  className="settings-input"
                  onClick={() => { onSendEOD(); onClose(); }}
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                >
                  📩 Send EOD Report
                </button>
              )}
              {onExportCSV && (
                <button
                  className="settings-input"
                  onClick={() => { onExportCSV(); onClose(); }}
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                >
                  📊 Export Data (CSV)
                </button>
              )}
            </div>
          </div>
        )}

        {/* PLAN & BETA */}
        {(isBetaTester !== undefined || currentPlan) && (
          <div className="settings-group">
            <label>Plan & Beta</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isBetaTester !== undefined && (
                <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={isBetaTester}
                      onChange={(e) => onToggleBeta?.(e.target.checked)}
                      style={{ width: 'auto', height: 'auto' }}
                    />
                    <span style={{ fontWeight: 'normal', fontSize: '14px' }}>
                      Beta Tester Mode
                    </span>
                  </label>
                  <span className="phone-hint" style={{ marginTop: '4px', marginLeft: '28px' }}>
                    Unlock all premium features for testing
                  </span>
                </div>
              )}
              {currentPlan && (
                <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '14px' }}>
                  <strong>Current Plan:</strong> {currentPlan}
                  {itemCount !== undefined && (
                    <div style={{ marginTop: '4px', color: '#64748b' }}>
                      {itemCount} items
                    </div>
                  )}
                </div>
              )}
              {onViewPlans && (
                <button
                  className="settings-input"
                  onClick={() => { onViewPlans(); onClose(); }}
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                >
                  📋 View Plans
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="settings-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          className="settings-save"
          onClick={onSave}
          disabled={!isDirty || !isValid || saving}
          style={{ opacity: !isDirty || !isValid || saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
