import React from "react";
import { cn } from "@/lib/utils";

/**
 * Enterprise Control Center Row — flat, horizontal, no card blocks.
 * Row 1: id + badges + check icons
 * Row 2: data items in a horizontal flow
 */
export default function CCRow({ onClick, locked, children, className }) {
  return (
    <div
      className={cn(
        "cc-row",
        !locked && onClick && "cc-row--clickable",
        locked && "cc-row--locked",
        className
      )}
      onClick={!locked ? onClick : undefined}
    >
      {children}
    </div>
  );
}

export function CCRowHeader({ children }) {
  return <div className="cc-row-header">{children}</div>;
}

export function CCRowData({ children }) {
  return <div className="cc-row-data">{children}</div>;
}

export function CCId({ children }) {
  return <span className="cc-row-id">{children}</span>;
}

export function CCBadge({ children, className }) {
  return <span className={cn("cc-badge", className)}>{children}</span>;
}

export function CCName({ children }) {
  return <span className="cc-name">{children}</span>;
}

export function CCMeta({ children }) {
  return <span className="cc-meta">{children}</span>;
}

export function CCVal({ variant, children }) {
  const cls = variant ? `cc-val cc-val--${variant}` : "cc-val";
  return <span className={cls}>{children}</span>;
}

export function CCList({ children }) {
  return <div className="cc-list">{children}</div>;
}