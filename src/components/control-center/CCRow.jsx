import React from "react";
import { cn } from "@/lib/utils";

/**
 * Enterprise Control Center — Rail Layout v2
 * 4 fixed zones per row:
 *   Zone 1 (35%): Name, department, badge
 *   Zone 2 (30%): Date, time (grouped)
 *   Zone 3 (10%): Hours (right-aligned, bold)
 *   Zone 4 (25%): Action buttons (right-aligned)
 */
export default function CCRow({ onClick, locked, children, className }) {
  return (
    <div
      className={cn(
        "rail-row",
        !locked && onClick && "rail-row--clickable",
        locked && "rail-row--locked",
        className
      )}
      onClick={!locked ? onClick : undefined}
    >
      {children}
    </div>
  );
}

/** Zone 1: Identity — name, department, badges */
export function CCZone1({ children }) {
  return <div className="rail-z1">{children}</div>;
}

/** Zone 2: Temporal — date, time grouped */
export function CCZone2({ children }) {
  return <div className="rail-z2">{children}</div>;
}

/** Zone 3: Metric — hours, km (right-aligned, bold) */
export function CCZone3({ children }) {
  return <div className="rail-z3">{children}</div>;
}

/** Zone 4: Actions — buttons (right-aligned) */
export function CCZone4({ children }) {
  return <div className="rail-z4">{children}</div>;
}

/** Container for rail rows */
export function CCList({ children }) {
  return <div className="rail-list">{children}</div>;
}

/* ---------- Inline text primitives ---------- */

export function CCId({ children }) {
  return <span className="rail-name">{children}</span>;
}

export function CCBadge({ children, className }) {
  return <span className={cn("rail-badge", className)}>{children}</span>;
}

export function CCName({ children }) {
  return <span className="rail-name">{children}</span>;
}

export function CCDept({ children }) {
  return <span className="rail-dept">{children}</span>;
}

export function CCMeta({ children }) {
  return <span className="rail-meta">{children}</span>;
}

export function CCVal({ variant, children }) {
  const cls = variant ? `rail-val rail-val--${variant}` : "rail-val";
  return <span className={cls}>{children}</span>;
}

export function CCHours({ children }) {
  return <span className="rail-hours">{children}</span>;
}

/* ---------- Legacy aliases (backwards compat) ---------- */
export function CCRowHeader({ children }) {
  return <div className="rail-z1">{children}</div>;
}
export function CCRowData({ children }) {
  return <div className="rail-z2">{children}</div>;
}