"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatCard from "./components/StatCard";
import { Bank, DashboardSummary, getBanks, getDashboardSummary } from "./libs/api";
import { formatGHS } from "./libs/format";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");
      const [summaryData, bankData] = await Promise.all([
        getDashboardSummary(),
        getBanks(),
      ]);

      setSummary(summaryData);
      setBanks(bankData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const chartData = banks.map((bank) => ({
    name: bank.name,
    balance: bank.balance,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Overview of church funds, bank balances, receipts, and payments.
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm">
          Financial Year: January - December
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-5">
        <StatCard
          title="Total Bank Balance"
          value={formatGHS(summary?.total_balance ?? 0)}
          helper="Across all church bank accounts"
          icon={Banknote}
        />

        <StatCard
          title="Receipts"
          value={formatGHS(summary?.receipts_total ?? 0)}
          helper="Total income recorded"
          icon={FileText}
        />

        <StatCard
          title="Payments"
          value={formatGHS(summary?.payments_total ?? 0)}
          helper="Total expenses recorded"
          icon={CreditCard}
        />

        <StatCard
          title="Savings"
          value={formatGHS(summary?.savings_total ?? 0)}
          helper="Savings module coming next"
          icon={PiggyBank}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Bank Balance Chart
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Current amount available in each bank.
              </p>
            </div>

            <Wallet className="text-blue-600" size={22} />
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatGHS(Number(value))}
                  labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                />
                <Bar dataKey="balance" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Bank Accounts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Active church bank accounts.
          </p>

          <div className="mt-6 space-y-3">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-950">{bank.name}</p>
                  <p className="font-black text-blue-700">
                    {formatGHS(bank.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}