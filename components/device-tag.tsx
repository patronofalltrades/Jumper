"use client";

import { useEffect } from "react";
import { deviceKind, PHONE_MAX_WIDTH } from "@/lib/device";

// Puts the device on <html>: data-device="phone" or "laptop", and data-touch="true" on touch screens.
// The layout itself uses CSS (Tailwind sm:), so the page is right before this script runs.
// Code that must act differently on a phone, such as tap-to-wire in build mode, reads these attributes.
export function DeviceTag() {
  useEffect(() => {
    const narrow = window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`);
    const touch = window.matchMedia("(pointer: coarse)");
    const update = () => {
      document.documentElement.dataset.device = deviceKind(window.innerWidth);
      document.documentElement.dataset.touch = String(touch.matches);
    };
    update();
    narrow.addEventListener("change", update);
    touch.addEventListener("change", update);
    return () => {
      narrow.removeEventListener("change", update);
      touch.removeEventListener("change", update);
    };
  }, []);
  return null;
}
