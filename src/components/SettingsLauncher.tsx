import React, { useState, Suspense, lazy } from "react";
import SettingsSpark from "./icons/SettingsSpark";

const BusinessSettingsSheet = lazy(() => import("./BusinessSettings"));

export default function SettingsLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open Settings"
        onClick={() => setOpen(true)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SettingsSpark size={20} stroke={2} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              maxWidth: 420,
              width: "100%",
              padding: 20,
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<p>Loading settings…</p>}>
              <BusinessSettingsSheet onClose={() => setOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
