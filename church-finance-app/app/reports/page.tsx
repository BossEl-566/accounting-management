"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Scale,
  TrendingUp,
} from "lucide-react";

import {
  exportReportExcel,
  getReportSummary,
  LedgerRow,
  ReportSummary,
} from "../lib/api";
import { formatGHS } from "../lib/format";

const chartColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be123c",
  "#4f46e5",
];

function ReportCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-400">{helper}</p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
      {message}
    </div>
  );
}

function LedgerTable({
  title,
  rows,
}: {
  title: string;
  rows: LedgerRow[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Accumulated ledger totals grouped by category and field name.
      </p>

      <div className="mt-5 max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
        <table className="w-full border-collapse bg-white text-left">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                Field
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                Entries
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                Total
              </th>
              <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                Date Range
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  No posted records yet.
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr
                key={`${row.category}-${row.subcategory}`}
                className="border-t border-slate-100"
              >
                <td className="px-5 py-4 font-black text-slate-950">
                  {row.category}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                  {row.subcategory}
                </td>
                <td className="px-5 py-4 text-sm font-black text-slate-700">
                  {row.entry_count}
                </td>
                <td className="px-5 py-4 text-sm font-black text-blue-700">
                  {formatGHS(row.total_amount)}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                  {row.first_date ?? "-"} to {row.last_date ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      const data = await getReportSummary(year);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportExcel() {
  try {
    setExporting(true);
    setError("");

    const blob = await exportReportExcel(year);
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `church_finance_report_${year}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to export Excel.");
  } finally {
    setExporting(false);
  }
}

  useEffect(() => {
    loadReport();
  }, [year]);

  const incomePieData = useMemo(() => {
    return report?.income_breakdown ?? [];
  }, [report]);

  const expensePieData = useMemo(() => {
    return report?.expense_breakdown ?? [];
  }, [report]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Reports
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Financial summaries, ledgers, comparisons, trends, and balance
            sheet view.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500"
          >
            {[year - 2, year - 1, year, year + 1].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
            <Download size={17} />
            {exporting ? "Exporting..." : "Export Excel"}
            </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
          Loading report...
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-4 gap-5">
            <ReportCard
              title="Total Receipts"
              value={formatGHS(report.summary.total_receipts)}
              helper={`Posted receipt sheets in ${report.year}`}
              icon={CircleDollarSign}
            />

            <ReportCard
              title="Total Payments"
              value={formatGHS(report.summary.total_payments)}
              helper={`Posted payment sheets in ${report.year}`}
              icon={FileSpreadsheet}
            />

            <ReportCard
              title="Net Position"
              value={formatGHS(report.summary.net)}
              helper="Receipts minus payments"
              icon={TrendingUp}
            />

            <ReportCard
              title="Total Assets"
              value={formatGHS(report.summary.total_assets)}
              helper="Banks + savings + petty cash"
              icon={Scale}
            />
          </div>

          <section className="grid grid-cols-3 gap-5">
            {report.comparisons.map((comparison) => {
              const isRising = comparison.direction === "rising";
              const isFalling = comparison.direction === "falling";

              return (
                <div
                  key={comparison.name}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        {comparison.name}
                      </p>
                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        {formatGHS(comparison.current_month)}
                      </h2>
                    </div>

                    <div
                      className={[
                        "rounded-2xl p-3",
                        isRising
                          ? "bg-green-50 text-green-700"
                          : isFalling
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {isFalling ? (
                        <ArrowDownRight size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-500">
                        Previous Month
                      </span>
                      <span className="font-black text-slate-900">
                        {formatGHS(comparison.previous_month)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-500">
                        Difference
                      </span>
                      <span
                        className={[
                          "font-black",
                          comparison.difference >= 0
                            ? "text-green-700"
                            : "text-red-700",
                        ].join(" ")}
                      >
                        {formatGHS(comparison.difference)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-500">Change</span>
                      <span
                        className={[
                          "font-black capitalize",
                          isRising
                            ? "text-green-700"
                            : isFalling
                            ? "text-red-700"
                            : "text-slate-600",
                        ].join(" ")}
                      >
                        {comparison.direction} ({comparison.percentage_change}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Receipts vs Payments Trend
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Month-by-month movement for the selected year.
                  </p>
                </div>

                <BarChart3 className="text-blue-600" size={22} />
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatGHS(Number(value))}
                      labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="receipts"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="payments"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Net Movement
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Receipts minus payments across the year.
                  </p>
                </div>

                <TrendingUp className="text-blue-600" size={22} />
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatGHS(Number(value))}
                      labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#2563eb"
                      fill="#dbeafe"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Income Breakdown
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Receipts grouped by accounting category.
                  </p>
                </div>

                <PieChartIcon className="text-blue-600" size={22} />
              </div>

              {incomePieData.length === 0 ? (
                <EmptyChart message="No posted receipt data yet." />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value) => formatGHS(Number(value))}
                        labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                      />
                      <Pie
                        data={incomePieData}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {incomePieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Expense Breakdown
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Payments grouped by accounting category.
                  </p>
                </div>

                <PieChartIcon className="text-red-600" size={22} />
              </div>

              {expensePieData.length === 0 ? (
                <EmptyChart message="No posted payment data yet." />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value) => formatGHS(Number(value))}
                        labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                      />
                      <Pie
                        data={expensePieData}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Income Category Totals
              </h2>

              <div className="mt-5 h-80">
                {report.income_breakdown.length === 0 ? (
                  <EmptyChart message="No income category data yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.income_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatGHS(Number(value))}
                        labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                      />
                      <Bar dataKey="total" fill="#16a34a" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Expense Category Totals
              </h2>

              <div className="mt-5 h-80">
                {report.expense_breakdown.length === 0 ? (
                  <EmptyChart message="No expense category data yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.expense_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatGHS(Number(value))}
                        labelStyle={{ color: "#0f172a", fontWeight: 800 }}
                      />
                      <Bar dataKey="total" fill="#dc2626" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Balance Sheet / Financial Position
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current assets held in banks, savings, and petty cash.
                </p>
              </div>

              <Scale className="text-blue-600" size={22} />
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-500">Bank Assets</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatGHS(report.summary.bank_total)}
                </p>

                <div className="mt-4 space-y-2">
                  {report.balance_sheet.assets.banks.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-bold text-slate-500">
                        {bank.name}
                      </span>
                      <span className="font-black text-slate-900">
                        {formatGHS(bank.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-500">
                  Savings Assets
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatGHS(report.summary.savings_total)}
                </p>

                <div className="mt-4 space-y-2">
                  {report.balance_sheet.assets.savings.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-bold text-slate-500">
                        {account.name}
                      </span>
                      <span className="font-black text-slate-900">
                        {formatGHS(account.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-sm font-bold text-slate-300">Total Assets</p>
                <p className="mt-2 text-3xl font-black">
                  {formatGHS(report.summary.total_assets)}
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">
                      Petty Cash
                    </span>
                    <span className="font-black">
                      {formatGHS(report.summary.petty_cash_balance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">
                      Banks + Savings + Cash
                    </span>
                    <span className="font-black">
                      {formatGHS(report.summary.total_assets)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <LedgerTable title="Receipt Ledger" rows={report.receipt_ledger} />
            <LedgerTable title="Payment Ledger" rows={report.payment_ledger} />
          </div>
        </>
      )}
    </div>
  );
}