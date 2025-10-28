import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "sh:profile:v1";
const Ctx = createContext(null);

export function BusinessProvider({ children }) {
  const [profile, setProfileState] = useState({ businessName: "", ownerName: "", phone: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setProfileState({
          businessName: p.businessName || "",
          ownerName: p.ownerName || "",
          phone: p.phone || "",
        });
        document.title = p.businessName?.trim() ? `${p.businessName} — Storehouse` : "Storehouse";
      } else {
        document.title = "Storehouse";
      }
    } catch {
      document.title = "Storehouse";
    }
  }, []);

  const setProfile = (patch) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      try { document.title = next.businessName?.trim() ? `${next.businessName} — Storehouse` : "Storehouse"; } catch {}
      return next;
    });
  };

  const resetProfile = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setProfileState({ businessName: "", ownerName: "", phone: "" });
    document.title = "Storehouse";
  };

  const isProfileComplete = !!(profile.businessName && profile.businessName.trim());
  const value = useMemo(() => ({ profile, setProfile, resetProfile, isProfileComplete }), [profile, isProfileComplete]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBusinessProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBusinessProfile must be used inside <BusinessProvider>");
  return ctx;
}
