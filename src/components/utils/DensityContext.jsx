import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DensityContext = createContext({
  density: "standard",
  setDensity: () => {},
  toggleDensity: () => {},
});

const STORAGE_KEY = "ui-density";
const VALID = ["standard", "compact"];

function readLocal() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : null;
  } catch { return null; }
}

function writeLocal(v) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch {}
}

export function DensityProvider({ children }) {
  const [density, setDensityState] = useState(() => readLocal() || "standard");

  // On mount: try to read user preference from API, fallback to localStorage
  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (user?.ui_density && VALID.includes(user.ui_density)) {
          setDensityState(user.ui_density);
          writeLocal(user.ui_density);
        }
      } catch {}
    })();
  }, []);

  // Sync data-density attribute on <html>
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setDensity = (value) => {
    if (!VALID.includes(value)) return;
    setDensityState(value);
    writeLocal(value);
    // Persist to user profile (fire-and-forget)
    base44.auth.updateMe({ ui_density: value }).catch(() => {});
  };

  const toggleDensity = () => {
    setDensity(density === "compact" ? "standard" : "compact");
  };

  return (
    <DensityContext.Provider value={{ density, setDensity, toggleDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  return useContext(DensityContext);
}