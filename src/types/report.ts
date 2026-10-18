import type { DesignMethod, SoilLayeringMethod } from "./design-method";

/**
 * The report layouts, matching `ReportTemplate` on the backend. `AUTO`
 * (the default) means "the template that matches the case".
 */
export const ReportTemplate = {
  AUTO: "AUTO",
  IEEE_80_86_ONE_LAYER: "IEEE_80_86_ONE_LAYER",
  IEEE_80_86_TWO_LAYER: "IEEE_80_86_TWO_LAYER",
  IEEE_80_2000_ONE_LAYER: "IEEE_80_2000_ONE_LAYER",
  IEEE_80_2000_TWO_LAYER: "IEEE_80_2000_TWO_LAYER",
} as const;

export type ReportTemplate =
  (typeof ReportTemplate)[keyof typeof ReportTemplate];

/** A template that can actually be generated (everything but `AUTO`). */
export type ConcreteReportTemplate = Exclude<
  ReportTemplate,
  typeof ReportTemplate.AUTO
>;

export const CONCRETE_REPORT_TEMPLATES: readonly ConcreteReportTemplate[] = [
  ReportTemplate.IEEE_80_86_ONE_LAYER,
  ReportTemplate.IEEE_80_86_TWO_LAYER,
  ReportTemplate.IEEE_80_2000_ONE_LAYER,
  ReportTemplate.IEEE_80_2000_TWO_LAYER,
];

export const REPORT_TEMPLATE_LABELS_FA: Record<ConcreteReportTemplate, string> =
  {
    [ReportTemplate.IEEE_80_86_ONE_LAYER]: "IEEE 80-86 (خاک تک‌لایه)",
    [ReportTemplate.IEEE_80_86_TWO_LAYER]: "IEEE 80-86 (خاک دولایه)",
    [ReportTemplate.IEEE_80_2000_ONE_LAYER]: "IEEE 80-2000 (خاک تک‌لایه)",
    [ReportTemplate.IEEE_80_2000_TWO_LAYER]: "IEEE 80-2000 (خاک دولایه)",
  };

/**
 * The template that matches a case, or `null` when its method has no
 * report yet (Galerkin). Mirrors `resolveReportTemplate` on the backend:
 * an IEEE case without a stored layering counts as one-layer.
 */
export function resolveReportTemplate(
  designMethod: DesignMethod,
  soilLayering: SoilLayeringMethod | null,
): ConcreteReportTemplate | null {
  const twoLayer = soilLayering === "TWO_LAYER";

  if (designMethod === "IEEE_80_86") {
    return twoLayer
      ? ReportTemplate.IEEE_80_86_TWO_LAYER
      : ReportTemplate.IEEE_80_86_ONE_LAYER;
  }
  if (designMethod === "IEEE_80_2000") {
    return twoLayer
      ? ReportTemplate.IEEE_80_2000_TWO_LAYER
      : ReportTemplate.IEEE_80_2000_ONE_LAYER;
  }
  return null;
}

/** Fault duration (s) from which the report can print "0.5 s or more". */
export const HALF_SECOND = 0.5;

/** The options a report was generated with (`Report.options` on the backend). */
export interface ReportOptions {
  includeDetails: boolean;
  halfSecondVariant: boolean;
}

/**
 * Mirrors `Report` entity on the backend. `filePath` is a server-side
 * absolute path (under `REPORTS_STORAGE_DIR`) — it's only meaningful to
 * the backend and is never used to build a URL client-side; downloading
 * always goes through `GET /reports/:id/download` instead.
 *
 * `template` / `options` are `null` (or absent from an older backend) for
 * reports generated before the per-method templates.
 */
export interface Report {
  id: string;
  name: string;
  filePath: string;
  project?: { id: string; name: string } | null;
  result?: { id: string } | null;
  template?: ConcreteReportTemplate | null;
  options?: ReportOptions | null;
  createdAt: string;
  updatedAt: string;
}
