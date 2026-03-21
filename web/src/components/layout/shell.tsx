import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

export function Shell() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("ch-dark");
    return saved === "true";
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ch-dark", String(dark));
  }, [dark]);

  return (
    <div className="min-h-screen">
      <Sidebar
        dark={dark}
        onToggleDark={() => setDark(!dark)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <main
        className={cn(
          "min-h-screen transition-all duration-200 p-6",
          collapsed ? "ml-16" : "ml-56"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
