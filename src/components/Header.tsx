import React, { useState, Suspense, lazy } from "react";
import "../styles/zfix.css";
import "../styles/header-icons.css";
import IconButton from "./IconButton";
import { CalculatorIcon, SettingsIcon } from "../ui/icons";

// Try to lazy-load your real settings sheet; if missing, fallback stays useful
let HasRealSheet = true;
const BusinessSettingsSheet = lazy(async () => {
  try {
    const m = await import("./BusinessSettings");
    return m;
  } catch (e) {
    console.warn("[Settings] Real sheet import failed. Using fallback only.", e);
    HasRealSheet = false;
    // Return a dummy component so Suspense still works
    return { default: () => null } as any;
  }
});

export default function Header() {
  const [open, setOpen] = useState(false);

  function openSettings() {
    console.log("[UI] Settings icon click");
    setOpen(true);
  }
  function closeSettings() {
    setOpen(false);
  }

  return (
    <header className="sh-header">
      <div className="sh-brand">Storehouse</div>

      <div className="header-actions" style={{display:'flex',gap:12}}>
        <IconButton
          ariaLabel="Calculator"
          title="Calculator"
          onClick={() => console.log("[UI] Calculator click")}
        >
          <CalculatorIcon aria-hidden="true" />
        </IconButton>

        <IconButton
          ariaLabel="Business Settings"
          title="Settings"
          onClick={openSettings}
        >
          <SettingsIcon aria-hidden="true" />
        </IconButton>

        {/* TEST BUTTON - Will be removed after verification */}
        <IconButton
          ariaLabel="Test WhatsApp Receipt"
          title="Test WhatsApp"
          onClick={() => {
            console.log("[UI] Test WhatsApp button clicked");
            window.dispatchEvent(new CustomEvent('test-whatsapp-receipt'));
          }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </IconButton>
      </div>

      {/* Fail-safe Settings modal (in Header so nothing else can break it) */}
      {open && (
        <>
          <div
            className="sh-mask"
            onClick={closeSettings}
            aria-hidden="true"
          />
          <div
            className="sh-modal"
            role="dialog"
            aria-label="Business Settings"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="sh-modal-title">Business Settings</h3>
            <p className="sh-modal-sub">
              This is the fail-safe modal. If your full Settings sheet exists,
              use the button below to open it.
            </p>

            <div className="sh-row">
              <button
                className="sh-btn"
                onClick={closeSettings}
              >
                Close
              </button>

              <button
                className="sh-btn primary"
                onClick={() => {
                  console.log("[UI] Try open real settings sheet");
                  // open an inner panel with Suspense: if the import succeeded, it renders.
                  const host = document.getElementById("real-settings-host");
                  if (!host) return;
                  host.style.display = "block";
                }}
              >
                Open full Settings
              </button>
            </div>

            {/* Host for the real sheet (if present). Keep hidden until user taps. */}
            <div id="real-settings-host" style={{ display: "none", marginTop: 12 }}>
              <Suspense fallback={<div className="sh-note">Loading settings…</div>}>
                <BusinessSettingsSheet onClose={closeSettings} />
              </Suspense>
              {!HasRealSheet && (
                <div className="sh-note">
                  Couldn't load the full settings component. The fail-safe is working, so your click path is good. Check import path: <code>./BusinessSettings</code>.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
