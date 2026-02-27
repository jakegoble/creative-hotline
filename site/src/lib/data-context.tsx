"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { createDataService, type DataService } from "./data-service";

interface DataContextValue {
  service: DataService;
  isDemoMode: boolean;
  setDemoMode: (v: boolean) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

interface DataProviderProps {
  children: ReactNode;
  initialDemoMode: boolean;
}

export function DataProvider({ children, initialDemoMode }: DataProviderProps) {
  const [isDemoMode, setDemoMode] = useState(initialDemoMode);
  const service = useMemo(
    () => createDataService(isDemoMode ? "demo" : "live"),
    [isDemoMode],
  );

  return (
    <DataContext.Provider value={{ service, isDemoMode, setDemoMode }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataService() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataService must be used within DataProvider");
  return ctx;
}
