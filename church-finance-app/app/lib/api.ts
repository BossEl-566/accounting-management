export const API_BASE_URL = "http://127.0.0.1:8000/api";

export type Bank = {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: number;
  transaction_type: "receipt" | "payment";
  category: string;
  subcategory: string | null;
  amount: number;
  bank_id: number | null;
  bank_name: string | null;
  source: string;
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
  const response = await fetch(`${API_BASE_URL}/banks`, {
    cache: "no-store",
  });

  return handleResponse<Bank[]>(response);
}

export async function createBank(payload: {
  name: string;
  balance: number;
}): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<Bank>(response);
}

export async function updateBank(
  id: number,
  payload: {
    name?: string;
    balance?: number;
  }
): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
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

export async function getReceipts(): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    cache: "no-store",
  });

  return handleResponse<Transaction[]>(response);
}

export async function createReceipt(payload: {
  category: string;
  subcategory?: string | null;
  amount: number;
  bank_id: number;
  note?: string | null;
}): Promise<Transaction> {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<Transaction>(response);
}

export async function updateReceipt(
  id: number,
  payload: {
    category: string;
    subcategory?: string | null;
    amount: number;
    bank_id: number;
    note?: string | null;
  }
): Promise<Transaction> {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<Transaction>(response);
}

export async function deleteReceipt(id: number): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
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