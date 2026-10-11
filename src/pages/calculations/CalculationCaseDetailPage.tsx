import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FullScreenSpinner } from "../../components/FullScreenSpinner";
import { CalculationCaseRenameModal } from "../../components/calculations/CalculationCaseRenameModal";
import { ResultSummary } from "../../components/calculations/ResultSummary";
import { VoltageHeatmap } from "../../components/calculations/VoltageHeatmap";
import { VoltageSurface3D } from "../../components/calculations/VoltageSurface3D";
import { VoltageProfileChart } from "../../components/calculations/VoltageProfileChart";
import { GenerateReportModal } from "../../components/reports/GenerateReportModal";
import { calculationCasesApi } from "../../api/calculations.api";
import { ApiError } from "../../types/api";
import type {
  CalculationCase,
  CalculationResult,
} from "../../types/calculation";
import { useAuth } from "../../context/useAuth";
import { UserRole } from "../../types/user";
import {
  DesignMethod,
  DESIGN_METHOD_LABELS_FA,
  SOIL_LAYERING_LABELS_FA,
} from "../../types/design-method";
import { ConductorSummaryCard } from "../../components/calculations/ConductorSummaryCard";

export function CalculationCaseDetailPage() {
  const { projectId, caseId } = useParams<{
    projectId: string;
    caseId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [calculationCase, setCalculationCase] =
    useState<CalculationCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(true);
  const [resultError, setResultError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [touchViewMode, setTouchViewMode] = useState<"2d" | "3d">("3d");
  const [stepViewMode, setStepViewMode] = useState<"2d" | "3d">("2d");

  // Reviewers can inspect a case and its results but not run new
  // calculations, edit, or delete it — same convention as the grid editor.
  const readOnly = user?.role === UserRole.REVIEWER;

  const fetchCase = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setCalculationCase(await calculationCasesApi.getOne(caseId));
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت کیس محاسباتی ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const fetchResult = useCallback(async () => {
    if (!caseId) return;
    setIsLoadingResult(true);
    setResultError(null);
    try {
      setResult(await calculationCasesApi.getResults(caseId));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        // No result yet — not an error state, just nothing to show.
        setResult(null);
      } else {
        setResultError(
          err instanceof ApiError ? err.messages[0] : "دریافت نتایج ناموفق بود."
        );
      }
    } finally {
      setIsLoadingResult(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
    fetchResult();
  }, [fetchCase, fetchResult]);

  if (!projectId || !caseId) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (loadError || !calculationCase) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-5 py-6 text-sm text-danger">
        {loadError ?? "کیس محاسباتی یافت نشد."}
      </div>
    );
  }

  const handleRun = async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      await calculationCasesApi.run(caseId);
      // Re-fetch through `getResults` rather than using `run`'s response
      // directly — it's the only endpoint that also returns the sample
      // maps the heatmaps below need. (`details` — Cs, Km/Ks, the 50/70 kg
      // limits, warnings, mesh counts — is saved with the result now, so
      // both endpoints return it.)
      await fetchResult();
    } catch (err) {
      setRunError(
        err instanceof ApiError ? err.messages[0] : "اجرای محاسبه ناموفق بود."
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    try {
      await calculationCasesApi.delete(caseId);
      navigate(`/projects/${projectId}`, { replace: true });
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "حذف کیس محاسباتی ناموفق بود."
      );
      throw err;
    }
  };

  const fault = calculationCase.fault;
  const settings = calculationCase.settings;
  // Real API fields now — see `enum/index.ts` in the backend's
  // `calculations` module.
  const designMethod = calculationCase.designMethod;

  return (
    <div>
      <Link
        to={`/projects/${projectId}`}
        className="text-xs font-medium text-text-muted transition-colors hover:text-copper-text"
      >
        ← بازگشت به پروژه
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">
            {calculationCase.name}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {calculationCase.grid?.name ?? "—"} ·{" "}
            {calculationCase.soilModel?.name ?? "—"}
          </p>
          {calculationCase.description && (
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              {calculationCase.description}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
            >
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              حذف
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border-soft bg-surface p-4 text-xs">
        <span className="text-text-faint">روش طراحی:</span>
        <span className="rounded-full border border-copper/40 px-2.5 py-0.5 font-mono text-copper-text">
          {DESIGN_METHOD_LABELS_FA[designMethod]}
        </span>
        {designMethod !== DesignMethod.GALERKIN &&
          calculationCase.soilLayering && (
            <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-text-muted">
              {SOIL_LAYERING_LABELS_FA[calculationCase.soilLayering]}
            </span>
          )}
        {designMethod === DesignMethod.GALERKIN ? (
          <span className="text-copper-text">
            (اجرای محاسبه برای این روش هنوز در بک‌اند پیاده‌سازی نشده است)
          </span>
        ) : (
          <span className="text-text-faint">
            (محاسبه با موتور «{DESIGN_METHOD_LABELS_FA[designMethod]}» اجرا
            می‌شود)
          </span>
        )}
      </div>

      <ConductorSummaryCard conductor={calculationCase.conductor} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-soft bg-surface p-5">
          <h3 className="text-sm font-bold text-text">پارامترهای خطا</h3>
          {fault ? (
            <dl
              className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs tabular text-text-muted"
              dir="ltr"
            >
              <div>
                <dt className="text-text-faint">If</dt>
                <dd>{fault.faultCurrent} A</dd>
              </div>
              <div>
                <dt className="text-text-faint">tf</dt>
                <dd>{fault.faultDuration} s</dd>
              </div>
              <div>
                <dt className="text-text-faint">Sf</dt>
                <dd>{fault.splitFactor}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Df</dt>
                <dd>{fault.decrementFactor}</dd>
              </div>
              <div>
                <dt className="text-text-faint">ts</dt>
                <dd>{fault.shockDuration} s</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs text-text-faint">
              اطلاعاتی ثبت نشده است.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border-soft bg-surface p-5">
          <h3 className="text-sm font-bold text-text">تنظیمات</h3>
          {settings ? (
            <dl
              className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs tabular text-text-muted"
              dir="ltr"
            >
              <div>
                <dt className="text-text-faint">ρs</dt>
                <dd>{settings.surfaceLayerResistivity} Ω·m</dd>
              </div>
              <div>
                <dt className="text-text-faint">hs</dt>
                <dd>{settings.surfaceLayerThickness} m</dd>
              </div>
              <div>
                <dt className="text-text-faint">weight</dt>
                <dd>{settings.bodyWeight} kg</dd>
              </div>
              <div>
                <dt className="text-text-faint">f</dt>
                <dd>{settings.frequency} Hz</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs text-text-faint">
              اطلاعاتی ثبت نشده است.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-text">نتایج محاسبه</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              مقاومت شبکه، GPR، ولتاژ مش/گام و ارزیابی ایمنی طبق IEEE 80.
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "در حال اجرا…" : "اجرای محاسبه"}
            </button>
          )}
        </div>

        {runError && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {runError}
          </p>
        )}

        <div className="mt-4">
          {isLoadingResult ? (
            <p className="text-xs text-text-faint">در حال بارگذاری…</p>
          ) : resultError ? (
            <p className="text-xs text-danger">{resultError}</p>
          ) : !result ? (
            <p className="text-xs text-text-faint">
              هنوز محاسبه‌ای برای این کیس انجام نشده است. برای مشاهدهٔ نتایج،
              دکمهٔ «اجرای محاسبه» را بزنید.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Results saved before the backend persisted `details` have
                  none; only people who can run calculations get the hint. */}
              {!result.details && !readOnly && (
                <p className="rounded-lg border border-border-soft bg-surface-2 px-3.5 py-2.5 text-xs text-text-muted">
                  این نتیجه پیش از ذخیرهٔ جزئیات محاسبه ثبت شده است. برای
                  مشاهدهٔ حدود مجاز ۵۰ و ۷۰ کیلوگرم، هشدارها و تعداد مش‌ها،
                  محاسبه را دوباره اجرا کنید.
                </p>
              )}

              <ResultSummary
                result={result}
                bodyWeight={settings?.bodyWeight}
              />

              {result.touchVoltageMap?.length ||
              result.stepVoltageMap?.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {result.touchVoltageMap && (
                    <div>
                      <ViewModeToggle
                        mode={touchViewMode}
                        onChange={setTouchViewMode}
                      />
                      {touchViewMode === "3d" ? (
                        <VoltageSurface3D
                          title="نقشهٔ ولتاژ تماس"
                          points={result.touchVoltageMap}
                        />
                      ) : (
                        <VoltageHeatmap
                          title="نقشهٔ ولتاژ تماس"
                          points={result.touchVoltageMap}
                        />
                      )}
                    </div>
                  )}
                  {result.stepVoltageMap && (
                    <div>
                      <ViewModeToggle
                        mode={stepViewMode}
                        onChange={setStepViewMode}
                      />
                      {stepViewMode === "3d" ? (
                        <VoltageSurface3D
                          title="نقشهٔ ولتاژ گام"
                          points={result.stepVoltageMap}
                        />
                      ) : (
                        <VoltageHeatmap
                          title="نقشهٔ ولتاژ گام"
                          points={result.stepVoltageMap}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {result.voltageProfile?.length ? (
                <VoltageProfileChart points={result.voltageProfile} />
              ) : null}

              {!readOnly && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsGeneratingReport(true)}
                    className="rounded-lg border border-copper/50 px-4 py-2 text-sm font-medium text-copper-text transition-colors hover:bg-copper/10"
                  >
                    تولید گزارش از این نتیجه
                  </button>
                  {reportNotice && (
                    <p className="mt-2 text-xs text-success">{reportNotice}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <CalculationCaseRenameModal
          calculationCase={calculationCase}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            fetchCase();
          }}
        />
      )}

      {isDeleting && (
        <ConfirmDialog
          title="حذف کیس محاسباتی"
          description={`آیا از حذف کیس محاسباتی «${calculationCase.name}» مطمئن هستید؟ نتایج و گزارش‌های وابسته نیز حذف می‌شوند.`}
          onCancel={() => setIsDeleting(false)}
          onConfirm={handleDelete}
        />
      )}

      {isGeneratingReport && result && (
        <GenerateReportModal
          resultId={result.id}
          defaultName={calculationCase.name}
          onClose={() => setIsGeneratingReport(false)}
          onGenerated={() => {
            setIsGeneratingReport(false);
            setReportNotice(
              "گزارش با موفقیت تولید شد. از بخش «گزارش‌ها» در صفحهٔ پروژه قابل دانلود است."
            );
          }}
        />
      )}
    </div>
  );
}

/** Small 2D/3D switch shown above each touch/step voltage map. */
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: "2d" | "3d";
  onChange: (mode: "2d" | "3d") => void;
}) {
  return (
    <div className="mb-1.5 flex justify-end gap-1">
      {(["2d", "3d"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
            mode === option
              ? "border-copper/50 bg-copper/10 text-copper-text"
              : "border-border text-text-faint hover:border-text-faint"
          }`}
        >
          {option === "2d" ? "نقشهٔ دو بعدی" : "نمای سه بعدی"}
        </button>
      ))}
    </div>
  );
}
