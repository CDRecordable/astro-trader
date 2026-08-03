// ============================================================
// AppShell — rail + secondary sidebar + content offset, in one place
// ============================================================
// The content offset used to be a hand-written `marginLeft: 72` repeated in
// eight view/page files (and `252` inside the /macro layout). Any change to
// the navigation width meant hunting them all down, and a section whose panel
// width differed silently misaligned. The shell owns the geometry now, so the
// views know nothing about the navigation.

"use client";

import React, { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import NavRail from "./NavRail";
import SubSidebar from "./SubSidebar";
import AssetClassSwitch from "./AssetClassSwitch";
import {
    activeSection, ASSET_AWARE_SECTIONS, RAIL_WIDTH, SUBSIDEBAR_WIDTH,
} from "@/lib/nav";

const COLLAPSE_KEY = "astro.nav.collapsed";
/** Width of the sliver left behind when the panel is collapsed. */
const COLLAPSED_WIDTH = 20;

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than copied into state inside an effect: that
// keeps the server render and the hydrated client render consistent, and
// avoids the cascading re-render an effect-then-setState would cause.
const COLLAPSE_EVENT = "astro:nav-collapse";

function subscribe(onChange: () => void) {
    window.addEventListener(COLLAPSE_EVENT, onChange);
    window.addEventListener("storage", onChange); // other tabs
    return () => {
        window.removeEventListener(COLLAPSE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}
const getSnapshot = () => localStorage.getItem(COLLAPSE_KEY) === "1";
/** The server can't know the preference; it renders the panel expanded. */
const getServerSnapshot = () => false;

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const section = activeSection(pathname);
    const hasPanel = !!section?.children?.length;

    const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const toggle = () => {
        localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
        window.dispatchEvent(new Event(COLLAPSE_EVENT));
    };

    const panelWidth = !hasPanel ? 0 : collapsed ? COLLAPSED_WIDTH : SUBSIDEBAR_WIDTH;
    const offset = RAIL_WIDTH + panelWidth;

    return (
        <>
            <NavRail />
            {hasPanel && section && (
                <SubSidebar section={section} collapsed={collapsed} onToggle={toggle} />
            )}
            <div
                style={{
                    marginLeft: offset,
                    width: `calc(100% - ${offset}px)`,
                    transition: "margin-left 160ms ease, width 160ms ease",
                }}
                className="min-h-screen app-content"
            >
                {section && ASSET_AWARE_SECTIONS.has(section.id) && <AssetClassSwitch />}
                {children}
            </div>
        </>
    );
}
