import { apiClient } from "./client";
import type { Balance, BalanceTransaction, Payment } from "@/types";

export const billingApi = {
  async getBalance(): Promise<Balance> {
    const r = await apiClient.get("/api/v1/billing/balance");
    return r.data;
  },

  async topup(
    amount: number,
    provider: "robokassa" | "stripe" = "robokassa",
  ): Promise<{ payment_url: string; payment_id: string }> {
    const r = await apiClient.post("/api/v1/billing/topup", { amount, provider });
    return r.data;
  },

  async listPayments(): Promise<Payment[]> {
    const r = await apiClient.get("/api/v1/billing/payments");
    return r.data;
  },

  async listTransactions(): Promise<BalanceTransaction[]> {
    const r = await apiClient.get("/api/v1/billing/transactions");
    return r.data;
  },
};
