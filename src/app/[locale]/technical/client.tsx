"use client";
import { Suspense } from "react";
import TechnicalWorkbench from "@/components/TechnicalWorkbench";

// Suspense: the workbench reads useSearchParams() for its ?symbol= deep-link,
// which Next requires to be wrapped so the shell can still prerender.
export default function TechnicalClient() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg-secondary)" }} />}>
            <TechnicalWorkbench />
        </Suspense>
    );
}
