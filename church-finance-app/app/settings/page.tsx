"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Database,
  Download,
  FileArchive,
  Save,
  Settings,
} from "lucide-react";

import {
  AppSettings,
  downloadCleanDatabase,
  downloadDatabaseBackup,
  getSettings,
  updateSettings,
} from "../lib/api";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [churchName, setChurchName] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [treasurerName, setTreasurerName] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [financialYearStartMonth, setFinancialYearStartMonth] = useState(1);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [generatingCleanDb, setGeneratingCleanDb] = useState(false);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const data = await getSettings();

      setSettings(data);
      setChurchName(data.church_name);
      setChurchAddress(data.church_address);
      setPastorName(data.pastor_name);
      setTreasurerName(data.treasurer_name);
      setCurrency(data.currency);
      setFinancialYearStartMonth(data.financial_year_start_month);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!churchName.trim()) {
      setError("Church name is required.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const updated = await updateSettings({
        church_name: churchName.trim(),
        church_address: churchAddress.trim(),
        pastor_name: pastorName.trim(),
        treasurer_name: treasurerName.trim(),
        currency: currency.trim().toUpperCase(),
        financial_year_start_month: financialYearStartMonth,
      });

      setSettings(updated);
      setSuccess("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    }
  }

  async function handleDownloadBackup() {
    try {
      setDownloadingBackup(true);
      setError("");
      setSuccess("");

      const blob = await downloadDatabaseBackup();
      const timestamp = new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");

      downloadBlob(blob, `church_finance_backup_${timestamp}.db`);
      setSuccess("Database backup downloaded successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download backup."
      );
    } finally {
      setDownloadingBackup(false);
    }
  }

  async function handleGenerateCleanDatabase() {
    const confirmed = window.confirm(
      "Generate a clean database for another church? This will not delete your current data."
    );

    if (!confirmed) return;

    try {
      setGeneratingCleanDb(true);
      setError("");
      setSuccess("");

      const blob = await downloadCleanDatabase();
      const timestamp = new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");

      downloadBlob(blob, `church_finance_clean_template_${timestamp}.db`);
      setSuccess("Clean database generated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate clean database."
      );
    } finally {
      setGeneratingCleanDb(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Settings
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Manage church information, backups, and clean database templates.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-bold text-slate-300">Current Church</p>
          <p className="mt-1 text-2xl font-black">
            {settings?.church_name ?? "Church Finance"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
          Loading settings...
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSaveSettings}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Building2 size={20} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Church Information
                </h2>
                <p className="text-sm text-slate-500">
                  These details will later appear on reports and exported Excel
                  files.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Church Name
                </label>
                <input
                  value={churchName}
                  onChange={(event) => setChurchName(event.target.value)}
                  placeholder="Example: FOGA"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Church Address
                </label>
                <input
                  value={churchAddress}
                  onChange={(event) => setChurchAddress(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Pastor Name
                </label>
                <input
                  value={pastorName}
                  onChange={(event) => setPastorName(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Treasurer / Accountant
                </label>
                <input
                  value={treasurerName}
                  onChange={(event) => setTreasurerName(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Currency
                </label>
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Financial Year Start Month
                </label>
                <select
                  value={financialYearStartMonth}
                  onChange={(event) =>
                    setFinancialYearStartMonth(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
            </div>

            <button className="mt-6 flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
              <Save size={17} />
              Save Settings
            </button>
          </form>

          <section className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-green-50 p-3 text-green-600">
                  <Database size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Backup Current Database
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Download the current database with all church records.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:bg-slate-300 disabled:shadow-none"
              >
                <Download size={17} />
                {downloadingBackup ? "Preparing Backup..." : "Download Backup"}
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <FileArchive size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Generate Clean Database
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a fresh database for another church without current
                    records.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateCleanDatabase}
                disabled={generatingCleanDb}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700 disabled:bg-slate-300 disabled:shadow-none"
              >
                <Settings size={17} />
                {generatingCleanDb
                  ? "Generating..."
                  : "Generate Clean Database"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}