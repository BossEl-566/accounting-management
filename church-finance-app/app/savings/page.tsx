"use client";

import { useEffect, useState } from "react";
import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";

import {
  Bank,
  SavingsAccount,
  SavingsTransfer,
  createSavingsAccount,
  createSavingsTransfer,
  deleteSavingsAccount,
  deleteSavingsTransfer,
  getBanks,
  getSavingsAccounts,
  getSavingsTransfers,
  updateSavingsAccount,
} from "../lib/api";
import { formatGHS } from "../lib/format";

export default function SavingsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transfers, setTransfers] = useState<SavingsTransfer[]>([]);

  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");

  const [sourceBankId, setSourceBankId] = useState("");
  const [savingsAccountId, setSavingsAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setError("");

      const [bankData, accountData, transferData] = await Promise.all([
        getBanks(),
        getSavingsAccounts(),
        getSavingsTransfers(),
      ]);

      setBanks(bankData);
      setAccounts(accountData);
      setTransfers(transferData);

      if (!sourceBankId && bankData.length > 0) {
        setSourceBankId(String(bankData[0].id));
      }

      if (!savingsAccountId && accountData.length > 0) {
        setSavingsAccountId(String(accountData[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load savings.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalSavings = accounts.reduce((sum, account) => sum + account.balance, 0);

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();

    const parsedBalance = Number(accountBalance || 0);

    if (!accountName.trim()) {
      setError("Savings account name is required.");
      return;
    }

    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setError("Starting balance cannot be negative.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await createSavingsAccount({
        name: accountName.trim(),
        balance: parsedBalance,
      });

      setAccountName("");
      setAccountBalance("");
      setSuccess("Savings account added successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add savings account."
      );
    }
  }

  async function handleTransfer(event: React.FormEvent) {
    event.preventDefault();

    const parsedBankId = Number(sourceBankId);
    const parsedSavingsId = Number(savingsAccountId);
    const parsedAmount = Number(transferAmount);

    if (!parsedBankId) {
      setError("Select the source bank.");
      return;
    }

    if (!parsedSavingsId) {
      setError("Select the savings account.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Transfer amount must be greater than zero.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await createSavingsTransfer({
        bank_id: parsedBankId,
        savings_account_id: parsedSavingsId,
        amount: parsedAmount,
        note: transferNote.trim() || null,
      });

      setTransferAmount("");
      setTransferNote("");
      setSuccess(
        "Savings transfer completed. Bank deducted and savings account credited."
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer savings.");
    }
  }

  function startEditing(account: SavingsAccount) {
    setEditingId(account.id);
    setEditName(account.name);
    setEditBalance(String(account.balance));
    setError("");
    setSuccess("");
  }

  async function saveEdit(id: number) {
    const parsedBalance = Number(editBalance || 0);

    if (!editName.trim()) {
      setError("Savings account name is required.");
      return;
    }

    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setError("Savings balance cannot be negative.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateSavingsAccount(id, {
        name: editName.trim(),
        balance: parsedBalance,
      });

      setEditingId(null);
      setSuccess("Savings account updated successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update savings account."
      );
    }
  }

  async function handleDeleteAccount(id: number) {
    const confirmed = window.confirm(
      "Delete this savings account? This only works if it has no records."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteSavingsAccount(id);

      setSuccess("Savings account deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete savings account."
      );
    }
  }

  async function handleDeleteTransfer(id: number) {
    const confirmed = window.confirm(
      "Delete this savings transfer? The amount will return to the bank and be removed from savings if possible."
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteSavingsTransfer(id);

      setSuccess("Savings transfer deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete savings transfer."
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Savings
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Manage Naatoa, Credit Union, and other church savings accounts.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-bold text-slate-300">Total Savings</p>
          <p className="mt-1 text-2xl font-black">{formatGHS(totalSavings)}</p>
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

      <section className="grid grid-cols-2 gap-6">
        <form
          onSubmit={handleCreateAccount}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Plus size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                Add Savings Account
              </h2>
              <p className="text-sm text-slate-500">
                Create another savings account later if needed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Example: Investment Account"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />

            <input
              value={accountBalance}
              onChange={(event) => setAccountBalance(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Starting balance"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />
          </div>

          <button className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
            Add Savings Account
          </button>
        </form>

        <form
          onSubmit={handleTransfer}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-green-50 p-3 text-green-600">
              <PiggyBank size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                Deposit into Savings
              </h2>
              <p className="text-sm text-slate-500">
                This deducts from a bank and credits a savings account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={sourceBankId}
              onChange={(event) => setSourceBankId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            >
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  From {bank.name} - {formatGHS(bank.balance)}
                </option>
              ))}
            </select>

            <select
              value={savingsAccountId}
              onChange={(event) => setSavingsAccountId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  To {account.name} - {formatGHS(account.balance)}
                </option>
              ))}
            </select>

            <input
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />

            <input
              value={transferNote}
              onChange={(event) => setTransferNote(event.target.value)}
              placeholder="Optional note"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />
          </div>

          <button className="mt-4 w-full rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-200 hover:bg-green-700">
            Transfer to Savings
          </button>
        </form>
      </section>

      <section className="grid grid-cols-3 gap-5">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-bold text-slate-500">{account.name}</p>
            <p className="mt-3 text-2xl font-black text-slate-950">
              {formatGHS(account.balance)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-black text-slate-950">
          Savings Accounts
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Account
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Balance
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {accounts.map((account) => {
                const isEditing = editingId === account.id;

                return (
                  <tr key={account.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-black text-slate-950">
                          {account.name}
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
                        <span className="font-black text-green-700">
                          {formatGHS(account.balance)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(account.id)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(account)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(account.id)}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-black text-slate-950">
          Savings Transfer History
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  From Bank
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  To Savings
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {transfers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No savings transfers yet.
                  </td>
                </tr>
              )}

              {transfers.map((transfer) => (
                <tr key={transfer.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {new Date(transfer.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 font-black text-slate-950">
                    {transfer.bank_name}
                  </td>

                  <td className="px-5 py-4 font-black text-slate-950">
                    {transfer.savings_account_name}
                  </td>

                  <td className="px-5 py-4 font-black text-green-700">
                    {formatGHS(transfer.amount)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransfer(transfer.id)}
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