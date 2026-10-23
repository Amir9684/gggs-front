import { useState } from "react";

import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { calculationCasesApi } from "../../api/calculations.api";
import { ApiError } from "../../types/api";
import {
  DEFAULT_GALERKIN_SETTINGS,
  type CalculationCase,
  type GalerkinSettings,
} from "../../types/calculation";

interface GalerkinSettingsCardProps {
  calculationCase: CalculationCase;
  /** Reviewers can see the settings but not change them. */
  readOnly: boolean;
  onSaved: () => void;
}

type FieldKey = keyof GalerkinSettings;

/** Same limits the backend enforces (`updateGalerkinSettingsSchema`). */
const FIELDS: Array<{
  key: FieldKey;
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  {
    key: "segmentLength",
    label: "طول قطعه (m)",
    hint: "هادی‌ها به قطعاتی با این طول تقسیم می‌شوند؛ کوچک‌تر یعنی دقیق‌تر و کندتر.",
    min: 0.5,
    max: 50,
  },
  {
    key: "rodRadius",
    label: "شعاع میله ارت (m)",
    hint: "برای همهٔ میله‌ها و چاه‌ها.",
    min: 0.001,
    max: 0.1,
  },
  {
    key: "wellDiameter",
    label: "قطر چاه (m)",
    hint: "فقط اگر در شبکه چاه ارت وجود دارد.",
    min: 0.05,
    max: 5,
  },
  {
    key: "wellLength",
    label: "طول چاه (m)",
    hint: "فقط اگر در شبکه چاه ارت وجود دارد.",
    min: 0.1,
    max: 50,
  },
  {
    key: "kro",
    label: "ضریب Kro",
    hint: "ضریب سوراخ‌بودن چاه‌ها.",
    min: 0.0001,
    max: 10,
  },
];

export function GalerkinSettingsCard({
  calculationCase,
  readOnly,
  onSaved,
}: GalerkinSettingsCardProps) {
  const current: GalerkinSettings = {
    ...DEFAULT_GALERKIN_SETTINGS,
    ...(calculationCase.galerkinSettings ?? {}),
  };

  const [values, setValues] = useState<Record<FieldKey, string>>({
    segmentLength: String(current.segmentLength),
    rodRadius: String(current.rodRadius),
    wellDiameter: String(current.wellDiameter),
    wellLength: String(current.wellLength),
    kro: String(current.kro),
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const payload: Partial<GalerkinSettings> = {};
    const problems: string[] = [];
    for (const field of FIELDS) {
      const raw = values[field.key].trim();
      const value = raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        problems.push(
          `${field.label}: عددی بین ${field.min} و ${field.max} وارد کنید.`
        );
      } else {
        payload[field.key] = value;
      }
    }
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setErrors([]);
    setIsSaving(true);
    try {
      await calculationCasesApi.updateGalerkinSettings(
        calculationCase.id,
        payload
      );
      setNotice("تنظیمات ذخیره شد. برای اعمال آن‌ها، محاسبه را دوباره اجرا کنید.");
      onSaved();
    } catch (err) {
      setErrors(
        err instanceof ApiError
          ? err.messages
          : ["ذخیرهٔ تنظیمات گالرکین ناموفق بود."]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 rounded-xl border border-border-soft bg-surface p-5"
    >
      <h3 className="text-sm font-bold text-text">تنظیمات گالرکین</h3>
      <p className="mt-0.5 text-xs text-text-muted">
        این روش فقط خاک تک‌لایه و شبکهٔ متعامد (هادی‌های موازی محور X یا Y) را
        پشتیبانی می‌کند. جریان تزریقی برابر If × Sf × Df است.
      </p>

      <div className="mt-4">
        <ErrorBanner messages={errors} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <FormField
              id={`galerkin-${field.key}`}
              label={field.label}
              type="number"
              step="any"
              dir="ltr"
              disabled={readOnly}
              value={values[field.key]}
              onChange={(e) =>
                setValues((previous) => ({
                  ...previous,
                  [field.key]: e.target.value,
                }))
              }
            />
            <p className="mt-1 text-xs text-text-faint">{field.hint}</p>
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg border border-copper/50 px-4 py-2 text-sm font-medium text-copper-text transition-colors hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات"}
          </button>
          {notice && <span className="text-xs text-success">{notice}</span>}
        </div>
      )}
    </form>
  );
}
