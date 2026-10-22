"use client";
import { useEffect } from "react";

// Closes open dropdowns (<details class="menu">) on an outside click, Escape, or after picking an item.
export default function MenuCloser() {
  useEffect(() => {
    const closeAll = (except) => document.querySelectorAll("details.menu[open]").forEach((d) => d !== except && d.removeAttribute("open"));
    const onClick = (e) => {
      const menu = e.target.closest("details.menu");
      if (menu && e.target.closest(".menu-pop a, .menu-pop button")) setTimeout(() => menu.removeAttribute("open"), 0);
      closeAll(menu);
    };
    const onKey = (e) => e.key === "Escape" && closeAll(null);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);
  return null;
}
