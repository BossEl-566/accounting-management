"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  Bank,
  Transaction,
  createReceipt,
  deleteReceipt,
  getBanks,
  getReceipts,
  updateReceipt,
} from "../lib/api";
import { formatGHS } from "../lib/format";

const CUSTOM_SUBCATEGORY = "__custom_subcategory__";

const receiptGroups = [
  {
    category: "Tithe",
    subcategories: ["General"],
  },
  {
    category: "Offerings",
    subcategories: ["1st Service", "2nd Service", "3rd Service"],
  },
  {
    category: "Project Offering",
    subcategories: ["1st Service", "2nd Service", "3rd Service"],
  },
  {
    category: "Weekday Offering",
    subcategories: ["Wednesday", "Friday", CUSTOM_SUBCATEGORY],
  },
  {
    category: "Donations",
    subcategories: ["General"],
  },
  {
    category: "E-Money",
    subcategories: ["General"],
  },
  {
    category: "Departmental Offering",
    subcategories: [
      "Youth",
      "Men",
      "Women",
      "Children",
      "Creative Art",
      "Sunday School",
      "Welfare",
    ],
  },
  {
    category: "Annual Thanksgiving Offering",
    subcategories: ["General"],
  },
  {
    category: "Sales",
    subcategories: ["Books", CUSTOM_SUBCATEGORY],
  },
  {
    category: "Financial Gain",
    subcategories: [
      "Interest on Account",
      "Interest on MoMo",
      "Interest on Investment",
      CUSTOM_SUBCATEGORY,
    ],
  },
  {
    category: "Other Receipt",
    subcategories: [CUSTOM_SUBCATEGORY],
  },
];

export default function ReceiptsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [receipts, setReceipts] = useState<Transaction[]>([]);

  const [category, setCategory] = useState("Tithe");
  const [subcategory, setSubcategory] = useState("General");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [note, setNote] = useState("");

  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedGroup = useMemo(() => {
    return receiptGroups.find((group) => group.category === category);
  }, [category]);

  const totalReceipts = receipts.reduce((sum, receipt) => {
    return sum + receipt.amount;
  }, 0);

  async function loadData() {
    try {
      setError("");

      const [bankData, receiptData] = await Promise.all([
        getBanks(),
        getReceipts(),
      ]);

      setBanks(bankData);
      setReceipts(receiptData);

      if (!bankId && bankData.length > 0) {
        setBankId(String(bankData[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipts.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setCategory("Tithe");
    setSubcategory("General");
    setCustomSubcategory("");
    setAmount("");
    setNote("");
    setEditingReceiptId(null);

    if (banks.length > 0) {
      setBankId(String(banks[0].id));
    }
  }

  function getFinalSubcategory() {
    if (subcategory === CUSTOM_SUBCATEGORY) {
      return customSubcategory.trim();
    }

    return subcategory;
  }

  function handleCategoryChange(value: string) {
    setCategory(value);

    const group = receiptGroups.find((item) => item.category === value);
    const firstSubcategory = group?.subcategories[0] ?? "General";

    setSubcategory(firstSubcategory);
    setCustomSubcategory("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    const parsedBankId = Number(bankId);
    const finalSubcategory = getFinalSubcategory();

    if (!category.trim()) {
      setError("Receipt category is required.");
      return;
    }

    if (!finalSubcategory) {
      setError("Receipt name/subcategory is required.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!parsedBankId) {
      setError("Please select a bank.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const payload = {
        category,
        subcategory: finalSubcategory,
        amount: parsedAmount,
        bank_id: parsedBankId,
        note: note.trim() || null,
      };

      if (editingReceiptId) {
        await updateReceipt(editingReceiptId, payload);
        setSuccess("Receipt updated successfully.");
      } else {
        await createReceipt(payload);
        setSuccess("Receipt recorded successfully and bank has been credited.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save receipt.");
    }
  }

  function startEditing(receipt: Transaction) {
    setEditingReceiptId(receipt.id);
    setCategory(receipt.category);
    setAmount(String(receipt.amount));
    setBankId(String(receipt.bank_id ?? ""));
    setNote(receipt.note ?? "");
    setSuccess("");
    setError("");

    const group = receiptGroups.find((item) => item.category === receipt.category);

    if (!group) {
      setCategory("Other Receipt");
      setSubcategory(CUSTOM_SUBCATEGORY);
      setCustomSubcategory(receipt.subcategory ?? receipt.category);
      return;
    }

    if (receipt.subcategory && group.subcategories.includes(receipt.subcategory)) {
      setSubcategory(receipt.subcategory);
      setCustomSubcategory("");
      return;
    }

    setSubcategory(CUSTOM_SUBCATEGORY);
    setCustomSubcategory(receipt.subcategory ?? "");
  }

  async function handleDeleteReceipt(receiptId: number) {
    const confirmed = window.confirm(
      "Delete this receipt? The amount will be removed from the selected bank."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteReceipt(receiptId);

      setSuccess("Receipt deleted successfully and bank balance has been corrected.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete receipt.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Receipts
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Record tithe, offerings, donations, sales, financial gains, and
            other income.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-bold text-slate-300">Total Receipts</p>
          <p className="mt-1 text-2xl font-black">
            {formatGHS(totalReceipts)}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Plus size={20} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              {editingReceiptId ? "Edit Receipt" : "Record Receipt"}
            </h2>
            <p className="text-sm text-slate-500">
              Select the receiving bank. The bank balance will update
              automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Receipt Group
            </label>
            <select
              value={category}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            >
              {receiptGroups.map((group) => (
                <option key={group.category} value={group.category}>
                  {group.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Receipt Name
            </label>
            <select
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            >
              {selectedGroup?.subcategories.map((item) => (
                <option key={item} value={item}>
                  {item === CUSTOM_SUBCATEGORY ? "Other / Add New" : item}
                </option>
              ))}
            </select>
          </div>

          {subcategory === CUSTOM_SUBCATEGORY && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Custom Name
              </label>
              <input
                value={customSubcategory}
                onChange={(event) => setCustomSubcategory(event.target.value)}
                placeholder="Enter receipt name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Amount
            </label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Receiving Bank
            </label>
            <select
              value={bankId}
              onChange={(event) => setBankId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            >
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} - {formatGHS(bank.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Note
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="col-span-4 flex justify-end gap-3">
            {editingReceiptId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              {editingReceiptId ? "Save Changes" : "Record Receipt"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid grid-cols-3 gap-5">
        {banks.map((bank) => (
          <div
            key={bank.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">{bank.name}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatGHS(bank.balance)}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Wallet size={20} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <ReceiptText size={20} />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Receipt Records
            </h2>
            <p className="text-sm text-slate-500">
              All receipt records entered into the system.
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
                  Group
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Bank
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {receipts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No receipts recorded yet.
                  </td>
                </tr>
              )}

              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {new Date(receipt.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      <span className="font-black text-slate-950">
                        {receipt.category}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {receipt.subcategory ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-sm font-black text-slate-950">
                    {receipt.bank_name ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-sm font-black text-green-700">
                    {formatGHS(receipt.amount)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditing(receipt)}
                        className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
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