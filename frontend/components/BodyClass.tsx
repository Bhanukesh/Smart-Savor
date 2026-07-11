"use client";

import { useEffect } from "react";

/** Toggles a class on <body> for the duration of a page (e.g. the patient background wash). */
export default function BodyClass({ name }: { name: string }) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
  return null;
}
