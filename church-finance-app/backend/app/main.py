from contextlib import asynccontextmanager
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import sqlite3
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "database" / "church_finance.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def money_to_pesewas(amount: Decimal) -> int:
    amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative.")

    return int(amount * 100)


def pesewas_to_money(amount_pesewas: int) -> float:
    return amount_pesewas / 100


def serialize_bank(row: sqlite3.Row):
    return {
        "id": row["id"],
        "name": row["name"],
        "balance": pesewas_to_money(row["balance_pesewas"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS banks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                balance_pesewas INTEGER NOT NULL DEFAULT 0 CHECK(balance_pesewas >= 0),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_type TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                amount_pesewas INTEGER NOT NULL CHECK(amount_pesewas >= 0),
                bank_id INTEGER,
                source TEXT NOT NULL DEFAULT 'bank',
                note TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(bank_id) REFERENCES banks(id)
            )
            """
        )

        for bank_name in ["NIB", "CBG", "Zenith"]:
            conn.execute(
                """
                INSERT OR IGNORE INTO banks (name, balance_pesewas)
                VALUES (?, ?)
                """,
                (bank_name, 0),
            )

        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Church Finance API",
    description="Local church finance and accounting backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BankCreate(BaseModel):
    name: str = Field(min_length=2)
    balance: Decimal = Field(default=Decimal("0.00"), ge=0)


class BankUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)
    balance: Optional[Decimal] = Field(default=None, ge=0)


@app.get("/api/health")
def health_check():
    return {
        "ok": True,
        "service": "Church Finance API",
        "database": str(DB_PATH),
    }


@app.get("/api/banks")
def get_banks():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, balance_pesewas, created_at, updated_at
            FROM banks
            ORDER BY name ASC
            """
        ).fetchall()

    return [serialize_bank(row) for row in rows]


@app.post("/api/banks")
def create_bank(payload: BankCreate):
    bank_name = payload.name.strip()

    if not bank_name:
        raise HTTPException(status_code=400, detail="Bank name is required.")

    balance_pesewas = money_to_pesewas(payload.balance)

    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO banks (name, balance_pesewas)
                VALUES (?, ?)
                """,
                (bank_name, balance_pesewas),
            )
            conn.commit()

            row = conn.execute(
                """
                SELECT id, name, balance_pesewas, created_at, updated_at
                FROM banks
                WHERE id = ?
                """,
                (cursor.lastrowid,),
            ).fetchone()

            return serialize_bank(row)

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="This bank already exists.")


@app.patch("/api/banks/{bank_id}")
def update_bank(bank_id: int, payload: BankUpdate):
    with get_connection() as conn:
        existing = conn.execute(
            """
            SELECT id, name, balance_pesewas, created_at, updated_at
            FROM banks
            WHERE id = ?
            """,
            (bank_id,),
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Bank not found.")

        new_name = existing["name"]
        new_balance = existing["balance_pesewas"]

        if payload.name is not None:
            new_name = payload.name.strip()
            if not new_name:
                raise HTTPException(status_code=400, detail="Bank name is required.")

        if payload.balance is not None:
            new_balance = money_to_pesewas(payload.balance)

        try:
            conn.execute(
                """
                UPDATE banks
                SET name = ?, balance_pesewas = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (new_name, new_balance, bank_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="This bank already exists.")

        updated = conn.execute(
            """
            SELECT id, name, balance_pesewas, created_at, updated_at
            FROM banks
            WHERE id = ?
            """,
            (bank_id,),
        ).fetchone()

    return serialize_bank(updated)


@app.delete("/api/banks/{bank_id}")
def delete_bank(bank_id: int):
    with get_connection() as conn:
        existing = conn.execute(
            """
            SELECT id FROM banks WHERE id = ?
            """,
            (bank_id,),
        ).fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Bank not found.")

        transaction_count = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM transactions
            WHERE bank_id = ?
            """,
            (bank_id,),
        ).fetchone()["total"]

        if transaction_count > 0:
            raise HTTPException(
                status_code=400,
                detail="This bank has transactions and cannot be deleted.",
            )

        conn.execute("DELETE FROM banks WHERE id = ?", (bank_id,))
        conn.commit()

    return {"ok": True, "message": "Bank deleted successfully."}


@app.get("/api/dashboard/summary")
def dashboard_summary():
    with get_connection() as conn:
        bank_summary = conn.execute(
            """
            SELECT
                COUNT(*) AS bank_count,
                COALESCE(SUM(balance_pesewas), 0) AS total_balance
            FROM banks
            """
        ).fetchone()

        receipts_total = conn.execute(
            """
            SELECT COALESCE(SUM(amount_pesewas), 0) AS total
            FROM transactions
            WHERE transaction_type = 'receipt'
            """
        ).fetchone()["total"]

        payments_total = conn.execute(
            """
            SELECT COALESCE(SUM(amount_pesewas), 0) AS total
            FROM transactions
            WHERE transaction_type = 'payment'
            """
        ).fetchone()["total"]

    return {
        "bank_count": bank_summary["bank_count"],
        "total_balance": pesewas_to_money(bank_summary["total_balance"]),
        "receipts_total": pesewas_to_money(receipts_total),
        "payments_total": pesewas_to_money(payments_total),
        "petty_cash_balance": 0,
        "savings_total": 0,
    }