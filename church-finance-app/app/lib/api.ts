export const API_BASE_URL = "http://127.0.0.1:8000/api";

export type Bank = {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type SavingsAccount = {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type SavingsTransfer = {
  id: number;
  bank_id: number;
  bank_name: string;
  savings_account_id: number;
  savings_account_name: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type ReceiptEntryInput = {
  category: string;
  subcategory: string;
  amount: number;
  bank_id: number;
  note?: string | null;
};

export type ReceiptEntry = {
  id: number;
  sheet_id: number;
  category: string;
  subcategory: string;
  amount: number;
  bank_id: number;
  bank_name: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ReceiptSheet = {
  id: number;
  title: string;
  sheet_date: string;
  status: "draft" | "posted";
  total_amount: number;
  created_at: string;
  updated_at: string;
  posted_at: string | null;
};

export type ReceiptSheetDetail = ReceiptSheet & {
  entries: ReceiptEntry[];
};

export type PaymentSource = "bank" | "savings" | "petty_cash";

export type PaymentEntryInput = {
  category: string;
  subcategory: string;
  amount: number;
  bank_id?: number | null;
  savings_account_id?: number | null;
  source: PaymentSource;
  note?: string | null;
};

export type PaymentEntry = {
  id: number;
  sheet_id: number;
  category: string;
  subcategory: string;
  amount: number;
  bank_id: number | null;
  bank_name: string | null;
  savings_account_id: number | null;
  savings_account_name: string | null;
  source: PaymentSource;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentSheet = {
  id: number;
  title: string;
  sheet_date: string;
  status: "draft" | "posted";
  total_amount: number;
  created_at: string;
  updated_at: string;
  posted_at: string | null;
};

export type PaymentSheetDetail = PaymentSheet & {
  entries: PaymentEntry[];
};

export type PettyCashSummary = {
  balance: number;
  total_withdrawn: number;
  total_spent: number;
};

export type PettyCashWithdrawal = {
  id: number;
  bank_id: number;
  bank_name: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type DashboardSummary = {
  bank_count: number;
  total_balance: number;
  receipts_total: number;
  payments_total: number;
  petty_cash_balance: number;
  savings_total: number;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "Something went wrong.");
  }

  return response.json();
}

export async function getBanks(): Promise<Bank[]> {
  const response = await fetch(`${API_BASE_URL}/banks`, { cache: "no-store" });
  return handleResponse<Bank[]>(response);
}

export async function createBank(payload: {
  name: string;
  balance: number;
}): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<Bank>(response);
}

export async function updateBank(
  id: number,
  payload: { name?: string; balance?: number }
): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<Bank>(response);
}

export async function deleteBank(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  const response = await fetch(`${API_BASE_URL}/savings/accounts`, {
    cache: "no-store",
  });

  return handleResponse<SavingsAccount[]>(response);
}

export async function createSavingsAccount(payload: {
  name: string;
  balance: number;
}): Promise<SavingsAccount> {
  const response = await fetch(`${API_BASE_URL}/savings/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<SavingsAccount>(response);
}

export async function updateSavingsAccount(
  id: number,
  payload: { name?: string; balance?: number }
): Promise<SavingsAccount> {
  const response = await fetch(`${API_BASE_URL}/savings/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<SavingsAccount>(response);
}

export async function deleteSavingsAccount(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/savings/accounts/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}

export async function getSavingsTransfers(): Promise<SavingsTransfer[]> {
  const response = await fetch(`${API_BASE_URL}/savings/transfers`, {
    cache: "no-store",
  });

  return handleResponse<SavingsTransfer[]>(response);
}

export async function createSavingsTransfer(payload: {
  bank_id: number;
  savings_account_id: number;
  amount: number;
  note?: string | null;
}): Promise<SavingsTransfer> {
  const response = await fetch(`${API_BASE_URL}/savings/transfers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<SavingsTransfer>(response);
}

export async function deleteSavingsTransfer(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/savings/transfers/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}
export async function getReceiptSheets(): Promise<ReceiptSheet[]> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets`, {
    cache: "no-store",
  });

  return handleResponse<ReceiptSheet[]>(response);
}

export async function getReceiptSheet(id: number): Promise<ReceiptSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/${id}`, {
    cache: "no-store",
  });

  return handleResponse<ReceiptSheetDetail>(response);
}

export async function getLatestReceiptDraft(): Promise<ReceiptSheetDetail | null> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/draft`, {
    cache: "no-store",
  });

  return handleResponse<ReceiptSheetDetail | null>(response);
}

export async function saveReceiptDraft(payload: {
  sheet_id?: number | null;
  title: string;
  entries: ReceiptEntryInput[];
}): Promise<ReceiptSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<ReceiptSheetDetail>(response);
}

export async function postReceiptSheet(id: number): Promise<ReceiptSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/${id}/post`, {
    method: "POST",
  });

  return handleResponse<ReceiptSheetDetail>(response);
}

export async function updatePostedReceiptSheet(
  id: number,
  payload: { title: string; entries: ReceiptEntryInput[] }
): Promise<ReceiptSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<ReceiptSheetDetail>(response);
}

export async function deleteReceiptSheet(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/receipt-sheets/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}

export async function getPaymentSheets(): Promise<PaymentSheet[]> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets`, {
    cache: "no-store",
  });

  return handleResponse<PaymentSheet[]>(response);
}

export async function getPaymentSheet(id: number): Promise<PaymentSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/${id}`, {
    cache: "no-store",
  });

  return handleResponse<PaymentSheetDetail>(response);
}

export async function getLatestPaymentDraft(): Promise<PaymentSheetDetail | null> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/draft`, {
    cache: "no-store",
  });

  return handleResponse<PaymentSheetDetail | null>(response);
}

export async function savePaymentDraft(payload: {
  sheet_id?: number | null;
  title: string;
  entries: PaymentEntryInput[];
}): Promise<PaymentSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<PaymentSheetDetail>(response);
}

export async function postPaymentSheet(id: number): Promise<PaymentSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/${id}/post`, {
    method: "POST",
  });

  return handleResponse<PaymentSheetDetail>(response);
}

export async function updatePostedPaymentSheet(
  id: number,
  payload: { title: string; entries: PaymentEntryInput[] }
): Promise<PaymentSheetDetail> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<PaymentSheetDetail>(response);
}

export async function deletePaymentSheet(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/payment-sheets/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}

export async function getPettyCashSummary(): Promise<PettyCashSummary> {
  const response = await fetch(`${API_BASE_URL}/petty-cash/summary`, {
    cache: "no-store",
  });

  return handleResponse<PettyCashSummary>(response);
}

export async function getPettyCashWithdrawals(): Promise<PettyCashWithdrawal[]> {
  const response = await fetch(`${API_BASE_URL}/petty-cash/withdrawals`, {
    cache: "no-store",
  });

  return handleResponse<PettyCashWithdrawal[]>(response);
}

export async function createPettyCashWithdrawal(payload: {
  bank_id: number;
  amount: number;
  note?: string | null;
}): Promise<PettyCashWithdrawal> {
  const response = await fetch(`${API_BASE_URL}/petty-cash/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<PettyCashWithdrawal>(response);
}

export async function deletePettyCashWithdrawal(
  id: number
): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/petty-cash/withdrawals/${id}`, {
    method: "DELETE",
  });

  return handleResponse<{ ok: boolean }>(response);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
    cache: "no-store",
  });

  return handleResponse<DashboardSummary>(response);
}