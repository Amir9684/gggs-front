import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "../ConfirmDialog";
import { reportsApi } from "../../api/reports.api";
import { ApiError } from "../../types/api";
import type { Report } from "../../types/report";

interface ReportsSectionProps {
  projectId: string;
}

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ReportsSection({ projectId }: ReportsSectionProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await reportsApi.getAll({ projectId, pageSize: 100 });
      setReports(result.list);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت گزارش‌ها ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    setLoadError(null);
    try {
      await reportsApi.download(report.id, report.name);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "دانلود گزارش ناموفق بود."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingReport) return;
    try {
      await reportsApi.delete(deletingReport.id);
      setDeletingReport(null);
      fetchReports();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "حذف گزارش ناموفق بود."
      );
      throw err;
    }
  };

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5">
      <div>
        <h3 className="text-sm font-bold text-text">گزارش‌ها</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          گزارش‌های تولیدشده برای نتایج محاسباتی این پروژه . گزارش جدید از صفحهٔ
          هر کیس محاسباتی، پس از اجرای محاسبه، تولید می‌شود.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-text-faint">در حال بارگذاری…</p>
      ) : loadError ? (
        <p className="mt-4 text-xs text-danger">{loadError}</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 text-xs text-text-faint">
          هنوز گزارشی برای این پروژه تولید نشده است.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-text">
                  {report.name}
                </span>
                <p
                  className="mt-1 font-mono text-xs tabular text-text-muted"
                  dir="ltr"
                >
                  {dateFormatter.format(new Date(report.createdAt))}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(report)}
                  disabled={downloadingId === report.id}
                  className="rounded-md border border-copper/50 px-3 py-1.5 text-xs font-medium text-copper-text transition-colors hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadingId === report.id ? "در حال دانلود…" : "دانلود"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingReport(report)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deletingReport && (
        <ConfirmDialog
          title="حذف گزارش"
          description={`آیا از حذف گزارش «${deletingReport.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setDeletingReport(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
