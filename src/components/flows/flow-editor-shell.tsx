"use client";

/**
 * View-switcher + chrome for the flow editor.
 *
 * Lays the editor out as one app-like column that fills the dashboard
 * content area (toolbar → mode row → stage → validation bar), matching
 * the Flow Builder design handoff:
 *   - A segmented Canvas / List control on the left of the mode row.
 *   - A node-type legend on the right so the canvas's per-type colors
 *     are decodable at a glance.
 *   - The active view is mounted inside a rounded "stage" that owns its
 *     own scroll/overflow, so the canvas can fill available height and
 *     the list scrolls internally.
 */

import { useEffect, useState } from "react";
import { GitFork, List } from "lucide-react";

import { FlowBuilder } from "./flow-builder";
import { FlowCanvas } from "./flow-canvas";
import { FlowEditorProvider } from "./flow-editor-state";
import { EditorHeader } from "./header";
import { ValidationPanel } from "./validation-panel";
import { NODE_META, nodeColors, type NodeType } from "./shared";
import { cn } from "@/lib/utils";
import type { FlowRow, FlowNodeRow } from "@/lib/flows/types";
import { useTranslations } from "@/lib/i18n-shim";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

type View = "canvas" | "list";

const STORAGE_KEY = "wacrm.flowEditor.view";

const LEGEND_TYPES = Object.keys(NODE_META) as NodeType[];

interface Props {
  initialFlow: FlowRow;
  initialNodes: FlowNodeRow[];
  baseReturnPath?: string;
}

export function FlowEditorShell({ initialFlow, initialNodes, baseReturnPath = "/crm/flows" }: Props) {
  const t = useTranslations("Flows.builder");

  const [view, setView] = useState<View>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "canvas" || saved === "list") return saved;
    } catch {
      // Private browsing / disabled storage
    }
    return "canvas";
  });

  const isMobile = useMatchMedia(MOBILE_BREAKPOINT);
  const effectiveView: View = isMobile ? "list" : view;

  const choose = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <FlowEditorProvider initialFlow={initialFlow} initialNodes={initialNodes}>
      <div className="flex h-full min-h-[calc(100vh-80px)] flex-col bg-slate-950 text-slate-100">
        <EditorHeader />

        {/* ---- mode row: view toggle + node-type legend ---- */}
        {!isMobile && (
          <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800/80 bg-slate-900/60">
            <div
              role="group"
              aria-label="Editor view"
              className="inline-flex gap-0.5 rounded-lg border border-slate-800 bg-slate-950 p-1"
            >
              <SegButton
                active={effectiveView === "canvas"}
                onClick={() => choose("canvas")}
                icon={<GitFork className="h-3.5 w-3.5" />}
                label={t("canvasView") || "Interactive Canvas"}
              />
              <SegButton
                active={effectiveView === "list"}
                onClick={() => choose("list")}
                icon={<List className="h-3.5 w-3.5" />}
                label={t("listView") || "Node List Editor"}
              />
            </div>
            <div className="ml-auto hidden flex-wrap items-center gap-x-3.5 gap-y-1.5 lg:flex">
              {LEGEND_TYPES.map((t_type) => (
                <span
                  key={t_type}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                    style={{ background: nodeColors(t_type).solid }}
                  />
                  {NODE_META[t_type]?.label || t_type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- stage: active view ---- */}
        <div className="relative mx-4 my-3 min-h-[520px] flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-inner">
          {effectiveView === "canvas" ? (
            <FlowCanvas />
          ) : (
            <div className="absolute inset-0 overflow-y-auto p-4">
              <FlowBuilder />
            </div>
          )}
        </div>

        {/* ---- validation / readiness bar ---- */}
        <div className="px-6 pb-5 pt-2">
          <ValidationPanel />
        </div>
      </div>
    </FlowEditorProvider>
  );
}

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function SegButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-slate-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
