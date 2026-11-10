"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatMinorToMoney, parseMajorToMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Plus, X, Receipt, ArrowDownRight, Tag } from "lucide-react";

interface Refund {
  refund_id: string;
  purchase_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  vendor_id: string | null;
  vendor_name: string | null;
  display_package_id: string | null;
  display_package_name: string | null;
  refund_amount_minor: string;
  currency: string;
  whmcs_transaction_id: string | null;
  reason: string | null;
  refund_date: string;
}

interface Expense {
  expense_id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  expense_title: string;
  expense_description: string | null;
  category: string;
  expense_amount_minor: string;
  currency: string;
  expense_date: string;
}

interface PurchaseOption {
  purchase_id: string;
  client_name: string;
  display_package_name: string | null;
  sales_amount_minor: string;
  currency: string;
  status: string;
}

interface VendorOption {
  vendor_id: string;
  vendor_name: string;
}

const CATEGORIES = [
  { id: "infrastructure", label: "Infrastructure / Servers", badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  { id: "software_licenses", label: "Software & Licenses", badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  { id: "payment_gateway", label: "Payment Gateway", badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  { id: "marketing", label: "Marketing / Ads", badge: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
  { id: "payroll", label: "Payroll / Staff", badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
  { id: "general", label: "General Operational", badge: "bg-slate-800 text-slate-300 border border-slate-700" },
];

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<"refunds" | "expenses">("refunds");

  // Data lists
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expense Category Filter
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modals
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Refund Form State
  const [refPurchaseId, setRefPurchaseId] = useState("");
  const [refAmountMajor, setRefAmountMajor] = useState("");
  const [refTxId, setRefTxId] = useState("");
  const [refReason, setRefReason] = useState("");
  const [refSubmitting, setRefSubmitting] = useState(false);

  // Expense Form State
  const [expTitle, setExpTitle] = useState("");
  const [expCategory, setExpCategory] = useState("general");
  const [expAmountMajor, setExpAmountMajor] = useState("");
  const [expCurrency, setExpCurrency] = useState("USD");
  const [expVendorId, setExpVendorId] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expSubmitting, setExpSubmitting] = useState(false);

  const fetchRefunds = useCallback(async () => {
    try {
      const res = await fetch("/api/refunds?limit=50");
      const json = await res.json();
      if (json.ok) setRefunds(json.data);
    } catch {
      setErrorMessage("Failed to load refunds ledger.");
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const url =
        filterCategory === "all"
          ? "/api/expenses?limit=50"
          : `/api/expenses?category=${filterCategory}&limit=50`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) setExpenses(json.data);
    } catch {
      setErrorMessage("Failed to load expenses ledger.");
    }
  }, [filterCategory]);

  const fetchLookups = useCallback(async () => {
    try {
      const [resPurchases, resVendors] = await Promise.all([
        fetch("/api/purchases?limit=100"),
        fetch("/api/vendors?limit=100"),
      ]);

      const [jsonPurchases, jsonVendors] = await Promise.all([
        resPurchases.json(),
        resVendors.json(),
      ]);

      if (jsonPurchases.ok) {
        setPurchases(
          jsonPurchases.data.map((p: any) => ({
            purchase_id: p.purchase_id,
            client_name: p.client_name,
            display_package_name: p.display_package_name,
            sales_amount_minor: p.sales_amount_minor,
            currency: p.currency,
            status: p.status,
          }))
        );
      }

      if (jsonVendors.ok) {
        setVendors(
          jsonVendors.data.map((v: any) => ({
            vendor_id: v.vendor_id,
            vendor_name: v.vendor_name,
          }))
        );
      }
    } catch {
      // Lookups fail gracefully
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRefunds(), fetchExpenses(), fetchLookups()]).finally(() =>
      setLoading(false)
    );
  }, [fetchRefunds, fetchExpenses, fetchLookups]);

  // Handlers
  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountMinor = parseMajorToMinor(refAmountMajor);
    if (!amountMinor || BigInt(amountMinor) <= 0n) {
      setErrorMessage("Please enter a valid positive refund amount.");
      return;
    }

    setRefSubmitting(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_id: refPurchaseId,
          refund_amount_minor: amountMinor,
          whmcs_transaction_id: refTxId.trim() || undefined,
          reason: refReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setShowRefundModal(false);
        setRefPurchaseId("");
        setRefAmountMajor("");
        setRefTxId("");
        setRefReason("");
        fetchRefunds();
      } else {
        setErrorMessage(json.error?.message || "Failed to issue refund.");
      }
    } catch {
      setErrorMessage("Network error while issuing refund.");
    } finally {
      setRefSubmitting(false);
    }
  };

  const handleDeleteRefund = async (id: string) => {
    if (!confirm("Are you sure you want to delete this refund record?")) return;
    try {
      const res = await fetch(`/api/refunds/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setRefunds((prev) => prev.filter((r) => r.refund_id !== id));
      } else {
        setErrorMessage(json.error?.message || "Failed to delete refund.");
      }
    } catch {
      setErrorMessage("Network error while deleting refund.");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountMinor = parseMajorToMinor(expAmountMajor);
    if (!amountMinor || BigInt(amountMinor) <= 0n) {
      setErrorMessage("Please enter a valid positive expense amount.");
      return;
    }

    setExpSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: expVendorId || undefined,
          expense_title: expTitle.trim(),
          expense_description: expDescription.trim() || undefined,
          category: expCategory,
          expense_amount_minor: amountMinor,
          currency: expCurrency,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setShowExpenseModal(false);
        setExpTitle("");
        setExpAmountMajor("");
        setExpVendorId("");
        setExpDescription("");
        fetchExpenses();
      } else {
        setErrorMessage(json.error?.message || "Failed to log expense.");
      }
    } catch {
      setErrorMessage("Network error while logging expense.");
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setExpenses((prev) => prev.filter((e) => e.expense_id !== id));
      } else {
        setErrorMessage(json.error?.message || "Failed to delete expense.");
      }
    } catch {
      setErrorMessage("Network error while deleting expense.");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Financials & Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit customer refunds and track operational expenses across infrastructure providers
          </p>
        </div>

        {/* Action Button depending on Active Tab */}
        <div>
          {activeTab === "refunds" ? (
            <Button
              onClick={() => {
                setErrorMessage(null);
                setShowRefundModal(true);
              }}
              className="w-full sm:w-auto cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium gap-1.5"
            >
              <Plus className="size-4" /> Issue Refund
            </Button>
          ) : (
            <Button
              onClick={() => {
                setErrorMessage(null);
                setShowExpenseModal(true);
              }}
              className="w-full sm:w-auto cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium gap-1.5"
            >
              <Plus className="size-4" /> Log Expense
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex justify-between items-center">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-destructive font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("refunds")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "refunds"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Customer Refunds ({refunds.length})
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "expenses"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Operational Expenses ({expenses.length})
        </button>
      </div>

      {/* TAB 1: REFUNDS */}
      {activeTab === "refunds" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading refunds ledger...
            </div>
          ) : refunds.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-2">
              <Receipt className="size-8 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-white">
                No refunds recorded
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Refunds issued for customer order cancellations will be listed here with automated order status updates.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Refund ID</th>
                      <th className="py-3 px-4 font-semibold">Order / Client</th>
                      <th className="py-3 px-4 font-semibold">Vendor & Plan</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">WHMCS Ref / Reason</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {refunds.map((r) => (
                      <tr key={r.refund_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          #{r.refund_id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {r.client_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Order #{r.purchase_id} · {r.client_email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">
                            {r.vendor_name || "Unassigned"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.display_package_name || "Custom Plan"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400">
                          -{formatMinorToMoney(r.refund_amount_minor, r.currency)}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          {r.whmcs_transaction_id && (
                            <div className="font-mono text-[11px] text-sky-400">
                              {r.whmcs_transaction_id}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 truncate">
                            {r.reason || "No reason specified"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(r.refund_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRefund(r.refund_id)}
                            className="text-destructive hover:underline text-[11px] font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterCategory === cat.id
                    ? "bg-primary text-white font-semibold"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading expenses ledger...
            </div>
          ) : expenses.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-2">
              <Tag className="size-8 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-white">
                No expenses logged for this filter
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Track dedicated server rentals, license costs, and marketing outlays to measure true company net profitability.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Expense ID</th>
                      <th className="py-3 px-4 font-semibold">Expense Title</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Attributed Vendor</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {expenses.map((e) => {
                      const catBadge =
                        CATEGORIES.find((c) => c.id === e.category)?.badge ||
                        "bg-slate-800 text-slate-300 border border-slate-700";

                      return (
                        <tr key={e.expense_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500">
                            #{e.expense_id}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              {e.expense_title}
                            </div>
                            {e.expense_description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {e.expense_description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${catBadge}`}
                            >
                              {e.category.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {e.vendor_name || (
                              <span className="text-slate-500">General Overhead</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {formatMinorToMoney(e.expense_amount_minor, e.currency)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(e.expense_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteExpense(e.expense_id)}
                              className="text-destructive hover:underline text-[11px] font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ISSUE REFUND */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                Issue Customer Refund
              </h2>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRefund} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Order / Purchase *
                </label>
                <select
                  required
                  value={refPurchaseId}
                  onChange={(e) => setRefPurchaseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white focus:outline-none focus:border-primary/60"
                >
                  <option value="">Select an order to refund...</option>
                  {purchases.map((p) => (
                    <option key={p.purchase_id} value={p.purchase_id}>
                      Order #{p.purchase_id} · {p.client_name} (
                      {formatMinorToMoney(p.sales_amount_minor, p.currency)}) · {p.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Refund Amount (Major Units, e.g. 12.50) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refAmountMajor}
                  onChange={(e) => setRefAmountMajor(e.target.value)}
                  placeholder="12.50"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WHMCS Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={refTxId}
                  onChange={(e) => setRefTxId(e.target.value)}
                  placeholder="e.g. TXN-10092"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Refund Reason (Audit Log)
                </label>
                <textarea
                  rows={2}
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  placeholder="e.g. Customer cancelled order within 24 hours"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  className="cursor-pointer border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={refSubmitting}
                  className="cursor-pointer bg-destructive text-white hover:bg-destructive/90 font-medium"
                >
                  {refSubmitting ? "Issuing..." : "Confirm Refund"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                Log Operational Expense (OPEX)
              </h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Hetzner Dedicated Server Root DX"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white focus:outline-none focus:border-primary/60"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Attributed Vendor
                  </label>
                  <select
                    value={expVendorId}
                    onChange={(e) => setExpVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white focus:outline-none focus:border-primary/60"
                  >
                    <option value="">None (General Overhead)</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Amount (Major Units) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmountMajor}
                    onChange={(e) => setExpAmountMajor(e.target.value)}
                    placeholder="45.00"
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white focus:outline-none focus:border-primary/60"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description / Invoice # (Optional)
                </label>
                <textarea
                  rows={2}
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="e.g. Monthly hardware lease invoice #88192"
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExpenseModal(false)}
                  className="cursor-pointer border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={expSubmitting}
                  className="cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium"
                >
                  {expSubmitting ? "Logging..." : "Log Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
