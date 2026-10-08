"use client";

import { useQuery } from "@tanstack/react-query";

import { billingApi } from "@/api/billing";

export function useBalance() {
  return useQuery({
    queryKey: ["balance"],
    queryFn: () => billingApi.getBalance(),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => billingApi.listPayments(),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["balance-transactions"],
    queryFn: () => billingApi.listTransactions(),
  });
}
