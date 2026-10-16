import type { ReactNode } from "react";

import {
  GridElementType,
  GRID_ELEMENT_TYPE_LABELS_FA,
} from "../../../types/grid";
import { GRID_ELEMENT_COLORS } from "../../../lib/grid-element-meta";
import type { CanvasTool } from "./GridCanvas";

const DRAW_TOOLS: GridElementType[] = [
  GridElementType.CONDUCTOR,
  GridElementType.ROD,
  GridElementType.WELL,
  GridElementType.FENCE,
  GridElementType.EQUIPMENT,
  GridElementType.BUILDING,
  GridElementType.GATE,
];

interface GridElementToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  snapEnabled: boolean;
  onSnapChange: (enabled: boolean) => void;
  /** Opens the parametric grid generator; the button is hidden without it. */
  onOpenGenerator?: () => void;
  disabled?: boolean;
}

export function GridElementToolbar({
  tool,
  onToolChange,
  snapEnabled,
  onSnapChange,
  onOpenGenerator,
  disabled = false,
}: GridElementToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-soft bg-surface p-3">
      <ToolButton
        active={tool === "select"}
        disabled={disabled}
        label="انتخاب"
        onClick={() => onToolChange("select")}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <path
            fill="currentColor"
            d="M2 1.5 13.5 8l-4.6.9L11.5 13l-1.8 1.2-2.6-4.2L4 12.5z"
          />
        </svg>
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-border-soft" />

      {DRAW_TOOLS.map((type) => (
        <ToolButton
          key={type}
          active={tool === type}
          disabled={disabled}
          label={GRID_ELEMENT_TYPE_LABELS_FA[type]}
          onClick={() => onToolChange(type)}
        >
          <ToolGlyph type={type} />
        </ToolButton>
      ))}

      <div className="mx-1 h-6 w-px bg-border-soft" />

      <label className="flex items-center gap-1.5 text-xs text-text-muted select-none">
        <input
          type="checkbox"
          checked={snapEnabled}
          disabled={disabled}
          onChange={(e) => onSnapChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-copper"
        />
        پیوستن به شبکهٔ ۰.۵ متری
      </label>

      {onOpenGenerator && (
        <>
          <div className="mx-1 h-6 w-px bg-border-soft" />
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenGenerator}
            className="flex items-center gap-1.5 rounded-lg border border-copper/50 px-2.5 py-1.5 text-xs font-medium text-copper-text transition-colors hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path
                d="M2 5.5h12M2 10.5h12M5.5 2v12M10.5 2v12"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            مولد شبکه
          </button>
        </>
      )}
    </div>
  );
}

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-copper bg-copper/15 text-copper-text"
          : "border-border text-text-muted hover:border-text-faint hover:text-text"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ToolGlyph({ type }: { type: GridElementType }) {
  const color = GRID_ELEMENT_COLORS[type];

  switch (type) {
    case GridElementType.CONDUCTOR:
    case GridElementType.FENCE:
      return (
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M2 13 13 3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={type === GridElementType.FENCE ? "2 2" : undefined}
          />
        </svg>
      );
    case GridElementType.BUILDING:
      return (
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <rect
            x="2.5"
            y="2.5"
            width="11"
            height="11"
            fill={`${color}33`}
            stroke={color}
            strokeWidth="1.5"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <circle cx="8" cy="8" r="4" fill={color} />
        </svg>
      );
  }
}
