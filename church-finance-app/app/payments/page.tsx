"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  Bank,
  PaymentEntry,
  PaymentEntryInput,
  PaymentSheet,
  PaymentSource,
  PettyCashSummary,
  PettyCashWithdrawal,
  SavingsAccount,
  createPettyCashWithdrawal,
  deletePaymentSheet,
  deletePettyCashWithdrawal,
  getBanks,
  getLatestPaymentDraft,
  getPaymentSheet,
  getPaymentSheets,
  getPettyCashSummary,
  getPettyCashWithdrawals,
  getSavingsAccounts,
  postPaymentSheet,
  savePaymentDraft,
  updatePostedPaymentSheet,
} from "../lib/api";
import { formatGHS } from "../lib/format";

type PaymentFormRow = {
  rowId: string;
  category: string;
  subcategory: string;
  amount: string;
  bank_id: string;
  savings_account_id: string;
  source: PaymentSource;
  note: string;
  isCustom?: boolean;
};

const sheetTitles = [
  "Sunday Payment Sheet",
  "Weekly Payment Sheet",
  "Monthly Payment Sheet",
  "Special Program Payment Sheet",
];

const pettyCashCategories = [
  "Utilities",
  "Donation & Support",
  "Decor",
  "Telephone & Communication",
  "Repairs & Maintenance",
  "Publicity",
  "Decoration",
];

const basePaymentRows = [
  ["Project / Building", "General"],

  ["Emoluments", "Pastor"],
  ["Emoluments", "Tax"],
  ["Emoluments", "SSNIT"],

  ["Utilities", "Electricity"],
  ["Utilities", "Water"],

  ["Rent", "General"],
  ["Donation & Support", "General"],
  ["Transportation & Conferences", "General"],
  ["Decor", "General"],

  ["Departmental Expenses", "Youth"],
  ["Departmental Expenses", "Women"],
  ["Departmental Expenses", "Men"],
  ["Departmental Expenses", "Children"],
  ["Departmental Expenses", "Creative Art"],
  ["Departmental Expenses", "Sunday School"],
  ["Departmental Expenses", "Welfare"],

  ["Medicals", "General"],

  ["Telephone & Communication", "Internet"],
  ["Telephone & Communication", "Post Office"],

  ["Honorariums", "General"],

  ["Repairs & Maintenance", "Buildings"],
  ["Repairs & Maintenance", "Instrument"],
  ["Repairs & Maintenance", "Mission House"],
  ["Repairs & Maintenance", "Electrical"],

  ["AOG Payments", "20% Tithes"],
  ["AOG Payments", "40% Contributions"],
  ["AOG Payments", "Levies"],

  ["Admin Expenses", "General"],
  ["Publicity", "General"],
  ["Decoration", "General"],

  ["Financial Charges", "Bank Charges"],
  ["Financial Charges", "International Charges"],

  ["Capital Expenditure", "General"],
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

function buildBlankRows(
  defaultBankId: string,
  defaultSavingsAccountId: string
): PaymentFormRow[] {
  return basePaymentRows.map(([category, subcategory]) => ({
    rowId: makeRowId(),
    category,
    subcategory,
    amount: "",
    bank_id: defaultBankId,
    savings_account_id: defaultSavingsAccountId,
    source: "bank",
    note: "",
  }));
}

function mergeSavedEntriesIntoRows(
  savedEntries: PaymentEntry[],
  defaultBankId: string,
  defaultSavingsAccountId: string
): PaymentFormRow[] {
  const rows = buildBlankRows(defaultBankId, defaultSavingsAccountId);

  for (const entry of savedEntries) {
    if (entry.source === "bank" || entry.source === "savings") {
      const existingRow = rows.find(
        (row) =>
          row.category === entry.category &&
          row.subcategory === entry.subcategory
      );

      if (existingRow) {
        existingRow.amount = String(entry.amount);
        existingRow.source = entry.source;
        existingRow.bank_id = entry.bank_id
          ? String(entry.bank_id)
          : defaultBankId;
        existingRow.savings_account_id = entry.savings_account_id
          ? String(entry.savings_account_id)
          : defaultSavingsAccountId;
        existingRow.note = entry.note ?? "";
        continue;
      }
    }

    rows.push({
      rowId: makeRowId(),
      category: entry.category,
      subcategory: entry.subcategory,
      amount: String(entry.amount),
      bank_id: entry.bank_id ? String(entry.bank_id) : defaultBankId,
      savings_account_id: entry.savings_account_id
        ? String(entry.savings_account_id)
        : defaultSavingsAccountId,
      source: entry.source,
      note: entry.note ?? "",
      isCustom: true,
    });
  }

  return rows;
}

export default function PaymentsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [sheets, setSheets] = useState<PaymentSheet[]>([]);
  const [pettyCashSummary, setPettyCashSummary] =
    useState<PettyCashSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<PettyCashWithdrawal[]>([]);

  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetStatus, setSheetStatus] = useState<"new" | "draft" | "posted">(
    "new"
  );
  const [sheetTitle, setSheetTitle] = useState("Sunday Payment Sheet");
  const [rows, setRows] = useState<PaymentFormRow[]>([]);

  const [withdrawBankId, setWithdrawBankId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");

  const [pettyCategory, setPettyCategory] = useState("Utilities");
  const [pettyName, setPettyName] = useState("");
  const [pettyAmount, setPettyAmount] = useState("");
  const [pettyNote, setPettyNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const defaultBankId = banks.length > 0 ? String(banks[0].id) : "";
  const defaultSavingsAccountId =
    savingsAccounts.length > 0 ? String(savingsAccounts[0].id) : "";

  const formTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      const amount = Number(row.amount || 0);
      return Number.isNaN(amount) ? sum : sum + amount;
    }, 0);
  }, [rows]);

  async function loadSheets() {
    const sheetData = await getPaymentSheets();
    setSheets(sheetData);
  }

  async function loadInitialData() {
    try {
      setError("");

      const [
        bankData,
        savingsData,
        draftData,
        sheetData,
        pettySummaryData,
        withdrawalData,
      ] = await Promise.all([
        getBanks(),
        getSavingsAccounts(),
        getLatestPaymentDraft(),
        getPaymentSheets(),
        getPettyCashSummary(),
        getPettyCashWithdrawals(),
      ]);

      setBanks(bankData);
      setSavingsAccounts(savingsData);
      setSheets(sheetData);
      setPettyCashSummary(pettySummaryData);
      setWithdrawals(withdrawalData);

      const firstBankId = bankData.length > 0 ? String(bankData[0].id) : "";
      const firstSavingsId =
        savingsData.length > 0 ? String(savingsData[0].id) : "";

      if (!withdrawBankId && firstBankId) {
        setWithdrawBankId(firstBankId);
      }

      if (draftData) {
        setSheetId(draftData.id);
        setSheetStatus(draftData.status);
        setSheetTitle(draftData.title);
        setRows(
          mergeSavedEntriesIntoRows(
            draftData.entries,
            firstBankId,
            firstSavingsId
          )
        );
      } else {
        setSheetId(null);
        setSheetStatus("new");
        setRows(buildBlankRows(firstBankId, firstSavingsId));
      }

      setHasLoadedInitialData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function updateRow(rowId: string, field: keyof PaymentFormRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.rowId !== rowId) return row;

        if (field === "source") {
          const nextSource = value as PaymentSource;

          return {
            ...row,
            source: nextSource,
            bank_id: nextSource === "bank" ? row.bank_id || defaultBankId : "",
            savings_account_id:
              nextSource === "savings"
                ? row.savings_account_id || defaultSavingsAccountId
                : "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  function buildPayloadEntries(strict: boolean): PaymentEntryInput[] {
    const entries: PaymentEntryInput[] = [];

    for (const row of rows) {
      const amount = Number(row.amount || 0);

      if (!row.amount || Number.isNaN(amount) || amount <= 0) {
        continue;
      }

      if (!row.subcategory.trim()) {
        if (strict) {
          throw new Error("Every filled amount must have a payment name.");
        }

        continue;
      }

      if (row.source === "bank" && !row.bank_id) {
        if (strict) {
          throw new Error("Every bank payment must have a selected bank.");
        }

        continue;
      }

      if (row.source === "savings" && !row.savings_account_id) {
        if (strict) {
          throw new Error(
            "Every savings payment must have a selected savings account."
          );
        }

        continue;
      }

      entries.push({
        category: row.category.trim(),
        subcategory: row.subcategory.trim(),
        amount,
        bank_id: row.source === "bank" ? Number(row.bank_id) : null,
        savings_account_id:
          row.source === "savings" ? Number(row.savings_account_id) : null,
        source: row.source,
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

      const savedDraft = await savePaymentDraft({
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
  }, [
    rows,
    sheetTitle,
    sheetId,
    sheetStatus,
    hasLoadedInitialData,
    banks.length,
    savingsAccounts.length,
  ]);

  async function handleWithdrawPettyCash(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(withdrawAmount);
    const parsedBankId = Number(withdrawBankId);

    if (!parsedBankId) {
      setError("Please select the bank to withdraw petty cash from.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Petty cash withdrawal amount must be greater than zero.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await createPettyCashWithdrawal({
        bank_id: parsedBankId,
        amount: parsedAmount,
        note: withdrawNote.trim() || null,
      });

      setWithdrawAmount("");
      setWithdrawNote("");
      setSuccess(
        "Petty cash withdrawn successfully. Bank balance has been deducted."
      );
      await loadInitialData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to withdraw petty cash."
      );
    }
  }

  async function handleDeleteWithdrawal(id: number) {
    const confirmed = window.confirm(
      "Delete this petty cash withdrawal? The amount will be returned to the bank if it has not already been spent."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deletePettyCashWithdrawal(id);

      setSuccess("Petty cash withdrawal deleted successfully.");
      await loadInitialData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete withdrawal."
      );
    }
  }

  function addPettyCashExpenseToSheet(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(pettyAmount);

    if (!pettyName.trim()) {
      setError("Enter the petty cash expense name.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Petty cash expense amount must be greater than zero.");
      return;
    }

    setRows((currentRows) => [
      ...currentRows,
      {
        rowId: makeRowId(),
        category: pettyCategory,
        subcategory: pettyName.trim(),
        amount: pettyAmount,
        bank_id: "",
        savings_account_id: "",
        source: "petty_cash",
        note: pettyNote.trim(),
        isCustom: true,
      },
    ]);

    setPettyName("");
    setPettyAmount("");
    setPettyNote("");
    setError("");
    setSuccess("Petty cash expense added to the payment sheet.");
  }

  async function handlePostSheet() {
    try {
      setError("");
      setSuccess("");

      const entries = buildPayloadEntries(true);

      if (entries.length === 0) {
        setError("You cannot post an empty payment sheet.");
        return;
      }

      if (sheetStatus === "posted") {
        if (!sheetId) return;

        await updatePostedPaymentSheet(sheetId, {
          title: sheetTitle,
          entries,
        });

        setSuccess(
          "Posted payment sheet updated successfully. Bank, savings, and petty cash balances have been corrected."
        );
        await loadInitialData();
        return;
      }

      const savedDraft = await savePaymentDraft({
        sheet_id: sheetId,
        title: sheetTitle,
        entries,
      });

      await postPaymentSheet(savedDraft.id);

      setSuccess("Payment sheet posted successfully.");
      startNewSheet();
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post sheet.");
    }
  }

  function startNewSheet() {
    setSheetId(null);
    setSheetStatus("new");
    setSheetTitle("Sunday Payment Sheet");
    setRows(buildBlankRows(defaultBankId, defaultSavingsAccountId));
    setDraftMessage("");
    setError("");
  }

  async function openSheet(id: number) {
    try {
      setError("");
      setSuccess("");

      const sheet = await getPaymentSheet(id);

      setSheetId(sheet.id);
      setSheetStatus(sheet.status);
      setSheetTitle(sheet.title);
      setRows(
        mergeSavedEntriesIntoRows(
          sheet.entries,
          defaultBankId,
          defaultSavingsAccountId
        )
      );
      setDraftMessage(
        sheet.status === "posted"
          ? "Viewing posted sheet. Changes affect banks, savings, and petty cash only when you save."
          : "Draft loaded."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open sheet.");
    }
  }

  async function handleDeleteSheet(id: number) {
    const confirmed = window.confirm(
      "Delete this payment sheet? Posted bank and savings deductions will be reversed, and petty cash expenses will be removed."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deletePaymentSheet(id);

      setSuccess("Payment sheet deleted successfully.");
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
        savings_account_id: defaultSavingsAccountId,
        source: "bank",
        note: "",
        isCustom: true,
      },
    ]);
  }

  function removeCustomRow(rowId: string) {
    setRows((currentRows) => currentRows.filter((row) => row.rowId !== rowId));
  }

  const groupedRows = useMemo(() => {
    return rows.reduce<Record<string, PaymentFormRow[]>>((groups, row) => {
      groups[row.category] = groups[row.category] || [];
      groups[row.category].push(row);
      return groups;
    }, {});
  }, [rows]);

  const customCategories = [
    "Emoluments",
    "Utilities",
    "Departmental Expenses",
    "Telephone & Communication",
    "Repairs & Maintenance",
    "Financial Charges",
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Payments
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Record payments from bank accounts, savings accounts, and petty cash.
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

      <section className="grid grid-cols-3 gap-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">
                Petty Cash Balance
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {formatGHS(pettyCashSummary?.balance ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Withdrawn</p>
              <p className="mt-1 font-black text-slate-950">
                {formatGHS(pettyCashSummary?.total_withdrawn ?? 0)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Spent</p>
              <p className="mt-1 font-black text-red-700">
                {formatGHS(pettyCashSummary?.total_spent ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleWithdrawPettyCash}
          className="col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-black text-slate-950">
            Withdraw Petty Cash
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            This deducts from a selected bank once and increases petty cash.
          </p>

          <div className="mt-5 grid grid-cols-4 gap-4">
            <select
              value={withdrawBankId}
              onChange={(event) => setWithdrawBankId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            >
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} - {formatGHS(bank.balance)}
                </option>
              ))}
            </select>

            <input
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />

            <input
              value={withdrawNote}
              onChange={(event) => setWithdrawNote(event.target.value)}
              placeholder="Optional note"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />

            <button className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white hover:bg-amber-700">
              Withdraw
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          Add Petty Cash Expense to Payment Sheet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          These expenses reduce petty cash, not bank or savings accounts.
        </p>

        <form
          onSubmit={addPettyCashExpenseToSheet}
          className="mt-5 grid grid-cols-5 gap-4"
        >
          <select
            value={pettyCategory}
            onChange={(event) => setPettyCategory(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
          >
            {pettyCashCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            value={pettyName}
            onChange={(event) => setPettyName(event.target.value)}
            placeholder="Expense name"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
          />

          <input
            value={pettyAmount}
            onChange={(event) => setPettyAmount(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
          />

          <input
            value={pettyNote}
            onChange={(event) => setPettyNote(event.target.value)}
            placeholder="Optional note"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
          />

          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
            Add Expense
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-red-600">
              <CreditCard size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                {sheetStatus === "posted"
                  ? "Edit Posted Payment Sheet"
                  : "Create Payment Sheet"}
              </h2>
              <p className="text-sm text-slate-500">
                Select whether each payment is from a bank or a savings account.
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
                    Fill only the fields that were paid.
                  </p>
                </div>

                {customCategories.includes(category) && (
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
                    <th className="w-[21%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Payment Name
                    </th>
                    <th className="w-[15%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Source
                    </th>
                    <th className="w-[15%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                    <th className="w-[24%] px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                      Account
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
                            placeholder="Enter payment name"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-sm font-black text-slate-800">
                            {row.subcategory}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {row.source === "petty_cash" ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            Petty Cash
                          </span>
                        ) : (
                          <select
                            value={row.source}
                            onChange={(event) =>
                              updateRow(row.rowId, "source", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          >
                            <option value="bank">Bank</option>
                            <option value="savings">Savings</option>
                          </select>
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
                        {row.source === "petty_cash" ? (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
                            From Petty Cash
                          </div>
                        ) : row.source === "savings" ? (
                          <select
                            value={row.savings_account_id}
                            onChange={(event) =>
                              updateRow(
                                row.rowId,
                                "savings_account_id",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          >
                            {savingsAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} - {formatGHS(account.balance)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={row.bank_id}
                            onChange={(event) =>
                              updateRow(row.rowId, "bank_id", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                          >
                            {banks.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name} - {formatGHS(bank.balance)}
                              </option>
                            ))}
                          </select>
                        )}
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
            className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-red-700"
          >
            <Send size={17} />
            {sheetStatus === "posted" ? "Save Changes" : "Post Payment Sheet"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-red-50 p-3 text-red-600">
            <FileText size={20} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Previous Payment Sheets
            </h2>
            <p className="text-sm text-slate-500">
              Posted sheets have already affected bank, savings, or petty cash
              balances.
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
                    No payment sheets yet.
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

                  <td className="px-5 py-4 font-black text-red-700">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          Petty Cash Withdrawals
        </h2>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Bank
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Note
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No petty cash withdrawals yet.
                  </td>
                </tr>
              )}

              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {new Date(withdrawal.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 font-black text-slate-950">
                    {withdrawal.bank_name}
                  </td>

                  <td className="px-5 py-4 font-black text-amber-700">
                    {formatGHS(withdrawal.amount)}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                    {withdrawal.note ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteWithdrawal(withdrawal.id)}
                      className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
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