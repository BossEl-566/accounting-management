"use client";

import { useEffect, useState } from "react";
import { Banknote, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Bank,
  createBank,
  deleteBank,
  getBanks,
  updateBank,
} from "../lib/api";
import { formatGHS } from "../lib/format";

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadBanks() {
    try {
      setError("");
      const data = await getBanks();
      setBanks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banks.");
    }
  }

  useEffect(() => {
    loadBanks();
  }, []);

  async function handleCreateBank(event: React.FormEvent) {
    event.preventDefault();

    const parsedBalance = Number(balance || 0);

    if (!name.trim()) {
      setError("Bank name is required.");
      return;
    }

    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setError("Bank amount must be zero or more.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await createBank({
        name: name.trim(),
        balance: parsedBalance,
      });

      setName("");
      setBalance("");
      setSuccess("Bank added successfully.");
      await loadBanks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bank.");
    }
  }

  function startEditing(bank: Bank) {
    setEditingBankId(bank.id);
    setEditName(bank.name);
    setEditBalance(String(bank.balance));
    setError("");
    setSuccess("");
  }

  async function saveEdit(bankId: number) {
    const parsedBalance = Number(editBalance || 0);

    if (!editName.trim()) {
      setError("Bank name is required.");
      return;
    }

    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setError("Bank balance cannot be negative.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateBank(bankId, {
        name: editName.trim(),
        balance: parsedBalance,
      });

      setEditingBankId(null);
      setSuccess("Bank updated successfully.");
      await loadBanks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bank.");
    }
  }

  async function handleDeleteBank(bankId: number) {
    const confirmed = window.confirm(
      "Delete this bank? This will only work if it has no transactions."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteBank(bankId);
      setSuccess("Bank deleted successfully.");
      await loadBanks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bank.");
    }
  }

  const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Banks
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Manage all church bank accounts and current balances.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-bold text-slate-300">Total Balance</p>
          <p className="mt-1 text-2xl font-black">{formatGHS(totalBalance)}</p>
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
            <h2 className="text-lg font-black text-slate-950">Add Bank</h2>
            <p className="text-sm text-slate-500">
              Add new church bank account and starting balance.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateBank} className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Bank Name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: GCB"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Amount
            </label>
            <input
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              Add Bank
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Banknote size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Bank Accounts
            </h2>
            <p className="text-sm text-slate-500">
              NIB, CBG, and Zenith are created automatically.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Bank
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Balance
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Last Updated
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {banks.map((bank) => {
                const isEditing = editingBankId === bank.id;

                return (
                  <tr key={bank.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-black text-slate-950">
                          {bank.name}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {isEditing ? (
                        <input
                          value={editBalance}
                          onChange={(event) =>
                            setEditBalance(event.target.value)
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-black text-blue-700">
                          {formatGHS(bank.balance)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-500">
                      {new Date(bank.updated_at).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(bank.id)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBankId(null)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(bank)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteBank(bank.id)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}