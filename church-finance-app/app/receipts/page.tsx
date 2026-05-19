"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Plus,
  ReceiptText,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import {
  Bank,
  ReceiptEntry,
  ReceiptEntryInput,
  ReceiptSheet,
  deleteReceiptSheet,
  getBanks,
  getLatestReceiptDraft,
  getReceiptSheet,
  getReceiptSheets,
  postReceiptSheet,
  saveReceiptDraft,
  updatePostedReceiptSheet,
} from "../lib/api";
import { formatGHS } from "../lib/format";

type ReceiptFormRow = {
  rowId: string;
  category: string;
  subcategory: string;
  amount: string;
  bank_id: string;
  note: string;
  isCustom?: boolean;
};

const sheetTitles = [
  "Sunday Receipt Sheet",
  "Wednesday Receipt Sheet",
  "Friday Receipt Sheet",
  "Special Program Receipt Sheet",
];

const baseReceiptRows = [
  ["Tithe", "General"],

  ["Offerings", "1st Service"],
  ["Offerings", "2nd Service"],
  ["Offerings", "3rd Service"],

  ["Project Offering", "1st Service"],
  ["Project Offering", "2nd Service"],
  ["Project Offering", "3rd Service"],

  ["Weekday Offering", "Wednesday"],
  ["Weekday Offering", "Friday"],

  ["Donations", "General"],
  ["E-Money", "General"],

  ["Departmental Offering", "Youth"],
  ["Departmental Offering", "Men"],
  ["Departmental Offering", "Women"],
  ["Departmental Offering", "Children"],
  ["Departmental Offering", "Creative Art"],
  ["Departmental Offering", "Sunday School"],
  ["Departmental Offering", "Welfare"],

  ["Annual Thanksgiving Offering", "General"],

  ["Sales", "Books"],

  ["Financial Gain", "Interest on Account"],
  ["Financial Gain", "Interest on MoMo"],
  ["Financial Gain", "Interest on Investment"],
];

function makeRowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-GH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildBlankRows(defaultBankId: string): ReceiptFormRow[] {
  return baseReceiptRows.map(([category, subcategory]) => ({
    rowId: makeRowId(),
    category,
    subcategory,
    amount: "",
    bank_id: defaultBankId,
    note: "",
  }));
}

function mergeSavedEntriesIntoRows(
  savedEntries: ReceiptEntry[],
  defaultBankId: string
): ReceiptFormRow[] {
  const rows = buildBlankRows(defaultBankId);

  for (const entry of savedEntries) {
    const existingRow = rows.find(
      (row) =>
        row.category === entry.category && row.subcategory === entry.subcategory
    );

    if (existingRow) {
      existingRow.amount = String(entry.amount);
      existingRow.bank_id = String(entry.bank_id);
      existingRow.note = entry.note ?? "";
    } else {
      rows.push({
        rowId: makeRowId(),
        category: entry.category,
        subcategory: entry.subcategory,
        amount: String(entry.amount),
        bank_id: String(entry.bank_id),
        note: entry.note ?? "",
        isCustom: true,
      });
    }
  }

  return rows;
}

export default function ReceiptsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [sheets, setSheets] = useState<ReceiptSheet[]>([]);

  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetStatus, setSheetStatus] = useState<"new" | "draft" | "posted">(
    "new"
  );
  const [sheetTitle, setSheetTitle] = useState("Sunday Receipt Sheet");
  const [rows, setRows] = useState<ReceiptFormRow[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const defaultBankId = banks.length > 0 ? String(banks[0].id) : "";

  const formTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      const amount = Number(row.amount || 0);
      return Number.isNaN(amount) ? sum : sum + amount;
    }, 0);
  }, [rows]);

  async function loadSheets() {
    const sheetData = await getReceiptSheets();
    setSheets(sheetData);
  }

  async function loadInitialData() {
    try {
      setError("");

      const [bankData, draftData, sheetData] = await Promise.all([
        getBanks(),
        getLatestReceiptDraft(),
        getReceiptSheets(),
      ]);

      setBanks(bankData);
      setSheets(sheetData);

      const firstBankId = bankData.length > 0 ? String(bankData[0].id) : "";

      if (draftData) {
        setSheetId(draftData.id);
        setSheetStatus(draftData.status);
        setSheetTitle(draftData.title);
        setRows(mergeSavedEntriesIntoRows(draftData.entries, firstBankId));
      } else {
        setSheetId(null);
        setSheetStatus("new");
        setRows(buildBlankRows(firstBankId));
      }

      setHasLoadedInitialData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipts.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function updateRow(rowId: string, field: keyof ReceiptFormRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function buildPayloadEntries(strict: boolean): ReceiptEntryInput[] {
    const entries: ReceiptEntryInput[] = [];

    for (const row of rows) {
      const amount = Number(row.amount || 0);

      if (!row.amount || Number.isNaN(amount) || amount <= 0) {
        continue;
      }

      if (!row.subcategory.trim()) {
        if (strict) {
          throw new Error("Every filled amount must have a receipt name.");
        }

        continue;
      }

      if (!row.bank_id) {
        if (strict) {
          throw new Error("Every filled amount must have a selected bank.");
        }

        continue;
      }

      entries.push({
        category: row.category.trim(),
        subcategory: row.subcategory.trim(),
        amount,
        bank_id: Number(row.bank_id),
        note: row.note.trim() || null,
      });
    }

    return entries;
  }

  async function autoSaveDraft() {
    if (!hasLoadedInitialData) return;
    if (sheetStatus === "posted") return;
    if (banks.length === 0) return;

    try {
      const entries = buildPayloadEntries(false);

      const savedDraft = await saveReceiptDraft({
        sheet_id: sheetId,
        title: sheetTitle,
        entries,
      });

      setSheetId(savedDraft.id);
      setSheetStatus("draft");
      setDraftMessage(`Draft auto-saved at ${new Date().toLocaleTimeString()}`);
      await loadSheets();
    } catch (err) {
      setDraftMessage("");
      setError(err instanceof Error ? err.message : "Failed to auto-save draft.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      autoSaveDraft();
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [rows, sheetTitle, sheetId, sheetStatus, hasLoadedInitialData, banks.length]);

  async function handlePostSheet() {
    try {
      setError("");
      setSuccess("");

      const entries = buildPayloadEntries(true);

      if (entries.length === 0) {
        setError("You cannot post an empty receipt sheet.");
        return;
      }

      if (sheetStatus === "posted") {
        if (!sheetId) return;

        await updatePostedReceiptSheet(sheetId, {
          title: sheetTitle,
          entries,
        });

        setSuccess(
          "Posted receipt sheet updated successfully. Bank balances have been corrected."
        );
        await loadInitialData();
        return;
      }

      const savedDraft = await saveReceiptDraft({
        sheet_id: sheetId,
        title: sheetTitle,
        entries,
      });

      await postReceiptSheet(savedDraft.id);

      setSuccess("Receipt sheet posted successfully. Banks have been credited.");
      startNewSheet();
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post sheet.");
    }
  }

  function startNewSheet() {
    setSheetId(null);
    setSheetStatus("new");
    setSheetTitle("Sunday Receipt Sheet");
    setRows(buildBlankRows(defaultBankId));
    setDraftMessage("");
    setError("");
  }

  async function openSheet(id: number) {
    try {
      setError("");
      setSuccess("");

      const sheet = await getReceiptSheet(id);

      setSheetId(sheet.id);
      setSheetStatus(sheet.status);
      setSheetTitle(sheet.title);
      setRows(mergeSavedEntriesIntoRows(sheet.entries, defaultBankId));
      setDraftMessage(
        sheet.status === "posted"
          ? "Viewing posted sheet. Changes affect banks only when you save."
          : "Draft loaded."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open sheet.");
    }
  }

  async function handleDeleteSheet(id: number) {
    const confirmed = window.confirm(
      "Delete this receipt sheet? If it is already posted, the bank credits will be reversed."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteReceiptSheet(id);

      setSuccess("Receipt sheet deleted successfully.");
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sheet.");
    }
  }

  function addCustomRow(category: string) {
    setRows((currentRows) => [
      ...currentRows,
      {
        rowId: makeRowId(),
        category,
        subcategory: "",
        amount: "",
        bank_id: defaultBankId,
        note: "",
        isCustom: true,
      },
    ]);
  }

  function removeCustomRow(rowId: string) {
    setRows((currentRows) => currentRows.filter((row) => row.rowId !== rowId));
  }

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, ReceiptFormRow[]>>((groups, row) => {
      groups[row.category] = groups[row.category] || [];
      groups[row.category].push(row);
      return groups;
    }, {});
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Receipts
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Create full receipt sheets, auto-save drafts, and post them to
            credit selected banks.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-bold text-slate-300">Current Sheet Total</p>
          <p className="mt-1 text-2xl font-black">{formatGHS(formTotal)}</p>
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <ReceiptText size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                {sheetStatus === "posted"
                  ? "Edit Posted Receipt Sheet"
                  : "Create Receipt Sheet"}
              </h2>
              <p className="text-sm text-slate-500">
                Drafts auto-save while typing. Banks update only after posting.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewSheet}
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            New Sheet
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sheet Title
            </label>
            <select
              value={sheetTitle}
              onChange={(event) => setSheetTitle(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            >
              {sheetTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              System Date
            </label>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              {getTodayLabel()}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black capitalize text-slate-700">
              {sheetStatus}
            </div>
          </div>
        </div>

        {draftMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            <Save size={16} />
            {draftMessage}
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(groupedRows).map(([category, categoryRows]) => (
            <div
              key={category}
              className="overflow-hidden rounded-3xl border border-slate-200"
            >
              <div className="flex items-center justify-between bg-slate-50 px-5 py-4">
                <div>
                  <h3 className="font-black text-slate-950">{category}</h3>
                  <p className="text-xs font-medium text-slate-500">
                    Fill only the fields that received money.
                  </p>
                </div>

                {[
                  "Weekday Offering",
                  "Sales",
                  "Financial Gain",
                  "Other Receipt",
                ].includes(category) && (
                  <button
                    type="button"
                    onClick={() => addCustomRow(category)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                  >
                    <Plus size={14} />
                    Add Field
                  </button>
                )}
              </div>

              <table className="w-full border-collapse bg-white text-left">
                <thead>
                  <tr className="border-t border-slate-100">
                    <th className="w-[28%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Receipt Name
                    </th>
                    <th className="w-[18%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                    <th className="w-[22%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Bank
                    </th>
                    <th className="px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Note
                    </th>
                    <th className="w-[70px] px-5 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categoryRows.map((row) => (
                    <tr key={row.rowId} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        {row.isCustom ? (
                          <input
                            value={row.subcategory}
                            onChange={(event) =>
                              updateRow(
                                row.rowId,
                                "subcategory",
                                event.target.value
                              )
                            }
                            placeholder="Enter receipt name"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-sm font-black text-slate-800">
                            {row.subcategory}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <input
                          value={row.amount}
                          onChange={(event) =>
                            updateRow(row.rowId, "amount", event.target.value)
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="px-5 py-3">
                        <select
                          value={row.bank_id}
                          onChange={(event) =>
                            updateRow(row.rowId, "bank_id", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        >
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-3">
                        <input
                          value={row.note}
                          onChange={(event) =>
                            updateRow(row.rowId, "note", event.target.value)
                          }
                          placeholder="Optional"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="px-5 py-3 text-right">
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCustomRow(row.rowId)}
                            className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-3xl bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-sm font-bold text-slate-300">Sheet Total</p>
            <p className="mt-1 text-2xl font-black">{formatGHS(formTotal)}</p>
          </div>

          <button
            type="button"
            onClick={handlePostSheet}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
          >
            <Send size={17} />
            {sheetStatus === "posted"
              ? "Save Changes"
              : "Post Receipt Sheet"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <FileText size={20} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Previous Receipt Sheets
            </h2>
            <p className="text-sm text-slate-500">
              Posted sheets have already updated bank balances.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Sheet
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Total
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sheets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No receipt sheets yet.
                  </td>
                </tr>
              )}

              {sheets.map((sheet) => (
                <tr key={sheet.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {new Date(sheet.sheet_date).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 font-black text-slate-950">
                    {sheet.title}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black capitalize",
                        sheet.status === "posted"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {sheet.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-black text-blue-700">
                    {formatGHS(sheet.total_amount)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openSheet(sheet.id)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        View / Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSheet(sheet.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}