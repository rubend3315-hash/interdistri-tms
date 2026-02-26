import React, { createContext, useContext, useState, useEffect } from "react";

const DensityContext = createContext({ density: "compact", setDensity: () => {} });

const STORAGE_KEY = "ui-density";

export function DensityProvider({ children }) {
  const [density, setDensityState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "compact";
    } catch {
      return "compact";
    }
  });

  const setDensity = (value) => {
    setDensityState(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  return useContext(DensityContext);
}