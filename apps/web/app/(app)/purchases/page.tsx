"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  formatMinorToMoney,
  parseMajorToMinor,
  minorToMajorInput,
} from "@/lib/money";

interface Client {
  client_id: string;
  client_name: string;
  client_email: string;
}

interface DisplayPackage {
  display_package_id: string;
  package_name: string;
  price_minor: string;
  currency: string;
  default_vendor_package_id: string | null;
}

interface Vendor {
  vendor_id: string;
  vendor_name: string;
}

interface VendorPackage {
  package_id: string;
  vendor_id: string;
  vendor_name: string;
  package_name: string;
  ram: string;
  storage: string;
  iso_code: string;
  price_minor: string;
  currency: string;
  billing_cycle: string;
}

interface Purchase {
  purchase_id: string;
  whmcs_order_id: string | null;
  whmcs_service_id: string | null;
  whmcs_invoice_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  display_package_id: string | null;
  display_package_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  package_id: string | null;
  vendor_package_name: string | null;
  ip_address: string | null;
  hostname: string | null;
  status: string;
  sales_amount_minor: string;
  purchase_amount_minor: string;
  processing_charges_minor: string;
  profit_amount_minor: string;
  currency: string;
  purchase_date: string;
  due_date: string | null;
  billing_cycle: string;
  payment_method: string | null;
}

type TabFilter = "all" | "pending_fulfillment" | "active" | "due_soon" | "other";

export default function PurchasesPage() {
  const [tab, setTab] = useState<TabFilter>("all");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [displayPackages, setDisplayPackages] = useState<DisplayPackage[]>([]);
  const [wholesalePackages, setWholesalePackages] = useState<VendorPackage[]>(
    []
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");

  // Fulfill Modal State
  const [fulfillTarget, setFulfillTarget] = useState<Purchase | null>(null);
  const [fulfillVendorPkgId, setFulfillVendorPkgId] = useState("");
  const [fulfillIp, setFulfillIp] = useState("");
  const [fulfillHostname, setFulfillHostname] = useState("");
  const [fulfillCostMajor, setFulfillCostMajor] = useState("");
  const [fulfillChargesMajor, setFulfillChargesMajor] = useState("0.00");

  // Create / Edit Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Purchase | null>(null);
  const [formClientId, setFormClientId] = useState("");
  const [formDisplayPkgId, setFormDisplayPkgId] = useState("");
  const [formWhmcsOrderId, setFormWhmcsOrderId] = useState("");
  const [formWhmcsServiceId, setFormWhmcsServiceId] = useState("");
  const [formSalesMajor, setFormSalesMajor] = useState("");
  const [formCostMajor, setFormCostMajor] = useState("0.00");
  const [formChargesMajor, setFormChargesMajor] = useState("0.00");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formStatus, setFormStatus] = useState("pending_fulfillment");
  const [formVendorId, setFormVendorId] = useState("");
  const [formPackageId, setFormPackageId] = useState("");
  const [formIp, setFormIp] = useState("");
  const [formHostname, setFormHostname] = useState("");
  const [formCycle, setFormCycle] = useState("monthly");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("");

  const fetchLookups = useCallback(async () => {
    try {
      const [cRes, dpRes, wpRes, vRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/display-packages"),
        fetch("/api/vendor-packages"),
        fetch("/api/vendors"),
      ]);
      const [cJson, dpJson, wpJson, vJson] = await Promise.all([
        cRes.json(),
        dpRes.json(),
        wpRes.json(),
        vRes.json(),
      ]);
      if (cJson.ok) setClients(cJson.data);
      if (dpJson.ok) setDisplayPackages(dpJson.data);
      if (wpJson.ok) setWholesalePackages(wpJson.data);
      if (vJson.ok) setVendors(vJson.data);
    } catch {
      setErrorMsg("Failed to load lookup data.");
    }
  }, []);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (filterVendorId) params.set("vendor_id", filterVendorId);

      if (tab === "pending_fulfillment") {
        params.set("status", "pending_fulfillment");
      } else if (tab === "active") {
        params.set("status", "active");
      } else if (tab === "due_soon") {
        params.set("due_within_days", "7");
      }

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        let rows: Purchase[] = json.data;
        if (tab === "other") {
          rows = rows.filter((r) =>
            ["suspended", "cancelled", "refunded"].includes(r.status)
          );
        }
        setPurchases(rows);
      } else {
        setErrorMsg(json.error?.message || "Failed to load orders");
      }
    } catch {
      setErrorMsg("Network error while loading orders.");
    } finally {
      setLoading(false);
    }
  }, [searchQ, filterVendorId, tab]);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchPurchases();
  }, [fetchPurchases]);

  // --- Fulfill Handlers ---
  function openFulfillModal(purchase: Purchase) {
    setFulfillTarget(purchase);
    setFulfillIp(purchase.ip_address || "");
    setFulfillHostname(purchase.hostname || "");
    setFulfillChargesMajor(minorToMajorInput(purchase.processing_charges_minor));

    // Auto-match wholesale package if mapped on display package or already assigned
    const defaultWpId =
      purchase.package_id ||
      displayPackages.find(
        (dp) => dp.display_package_id === purchase.display_package_id
      )?.default_vendor_package_id ||
      wholesalePackages[0]?.package_id ||
      "";

    setFulfillVendorPkgId(defaultWpId);
    const wp = wholesalePackages.find((w) => w.package_id === defaultWpId);
    if (wp) {
      setFulfillCostMajor(minorToMajorInput(wp.price_minor));
    } else {
      setFulfillCostMajor("0.00");
    }
  }

  function handleFulfillWholesaleSelect(wpId: string) {
    setFulfillVendorPkgId(wpId);
    const wp = wholesalePackages.find((w) => w.package_id === wpId);
    if (wp) {
      setFulfillCostMajor(minorToMajorInput(wp.price_minor));
    }
  }

  const fulfillLiveProfit = useMemo(() => {
    if (!fulfillTarget) return null;
    const costMinor = parseMajorToMinor(fulfillCostMajor);
    const chargesMinor = parseMajorToMinor(fulfillChargesMajor);
    if (costMinor === null || chargesMinor === null) return null;

    const sales = BigInt(fulfillTarget.sales_amount_minor);
    const cost = BigInt(costMinor);
    const charges = BigInt(chargesMinor);
    const profit = sales - cost - charges;
    return {
      minor: profit.toString(),
      isPositive: profit >= 0n,
    };
  }, [fulfillTarget, fulfillCostMajor, fulfillChargesMajor]);

  async function handleFulfillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fulfillTarget) return;
    setErrorMsg(null);

    const costMinor = parseMajorToMinor(fulfillCostMajor);
    const chargesMinor = parseMajorToMinor(fulfillChargesMajor);
    if (costMinor === null || chargesMinor === null) {
      setErrorMsg("Please enter valid cost and processing charges");
      return;
    }

    const selectedWp = wholesalePackages.find(
      (w) => w.package_id === fulfillVendorPkgId
    );
    if (!selectedWp) {
      setErrorMsg("Please select an upstream wholesale VPS package");
      return;
    }

    const payload = {
      vendor_id: selectedWp.vendor_id,
      package_id: selectedWp.package_id,
      ip_address: fulfillIp.trim(),
      hostname: fulfillHostname.trim() || null,
      purchase_amount_minor: costMinor,
      processing_charges_minor: chargesMinor,
    };

    const res = await fetch(`/api/purchases/${fulfillTarget.purchase_id}/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to fulfill order");
      return;
    }

    setFulfillTarget(null);
    await fetchPurchases();
  }

  // --- Order Create / Edit Handlers ---
  function openCreateOrderModal() {
    setEditingOrder(null);
    setFormClientId(clients[0]?.client_id || "");
    setFormDisplayPkgId(displayPackages[0]?.display_package_id || "");
    setFormWhmcsOrderId("");
    setFormWhmcsServiceId("");
    if (displayPackages[0]) {
      setFormSalesMajor(minorToMajorInput(displayPackages[0].price_minor));
      setFormCurrency(displayPackages[0].currency);
    } else {
      setFormSalesMajor("");
      setFormCurrency("USD");
    }
    setFormCostMajor("0.00");
    setFormChargesMajor("0.00");
    setFormStatus("pending_fulfillment");
    setFormVendorId("");
    setFormPackageId("");
    setFormIp("");
    setFormHostname("");
    setFormCycle("monthly");
    setFormDueDate("");
    setFormPaymentMethod("");
    setShowOrderModal(true);
  }

  function openEditOrderModal(p: Purchase) {
    setEditingOrder(p);
    setFormClientId(p.client_id);
    setFormDisplayPkgId(p.display_package_id || "");
    setFormWhmcsOrderId(p.whmcs_order_id || "");
    setFormWhmcsServiceId(p.whmcs_service_id || "");
    setFormSalesMajor(minorToMajorInput(p.sales_amount_minor));
    setFormCostMajor(minorToMajorInput(p.purchase_amount_minor));
    setFormChargesMajor(minorToMajorInput(p.processing_charges_minor));
    setFormCurrency(p.currency);
    setFormStatus(p.status);
    setFormVendorId(p.vendor_id || "");
    setFormPackageId(p.package_id || "");
    setFormIp(p.ip_address || "");
    setFormHostname(p.hostname || "");
    setFormCycle(p.billing_cycle);
    setFormDueDate(p.due_date ? p.due_date.slice(0, 10) : "");
    setFormPaymentMethod(p.payment_method || "");
    setShowOrderModal(true);
  }

  function handleSelectDisplayPackage(dpId: string) {
    setFormDisplayPkgId(dpId);
    const dp = displayPackages.find((d) => d.display_package_id === dpId);
    if (dp) {
      setFormSalesMajor(minorToMajorInput(dp.price_minor));
      setFormCurrency(dp.currency);
      if (dp.default_vendor_package_id) {
        setFormPackageId(dp.default_vendor_package_id);
        const wp = wholesalePackages.find(
          (w) => w.package_id === dp.default_vendor_package_id
        );
        if (wp) {
          setFormVendorId(wp.vendor_id);
          setFormCostMajor(minorToMajorInput(wp.price_minor));
        }
      }
    }
  }

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const salesMinor = parseMajorToMinor(formSalesMajor);
    const costMinor = parseMajorToMinor(formCostMajor);
    const chargesMinor = parseMajorToMinor(formChargesMajor);

    if (salesMinor === null || costMinor === null || chargesMinor === null) {
      setErrorMsg("Please enter valid monetary amounts");
      return;
    }

    const payload = {
      whmcs_order_id: formWhmcsOrderId.trim() ? formWhmcsOrderId.trim() : null,
      whmcs_service_id: formWhmcsServiceId.trim()
        ? formWhmcsServiceId.trim()
        : null,
      client_id: formClientId,
      display_package_id: formDisplayPkgId || null,
      vendor_id: formVendorId || null,
      package_id: formPackageId || null,
      ip_address: formIp.trim() || null,
      hostname: formHostname.trim() || null,
      status: formStatus,
      sales_amount_minor: salesMinor,
      purchase_amount_minor: costMinor,
      processing_charges_minor: chargesMinor,
      currency: formCurrency,
      billing_cycle: formCycle,
      due_date: formDueDate ? new Date(formDueDate).toISOString() : null,
      payment_method: formPaymentMethod.trim() || null,
    };

    const url = editingOrder
      ? `/api/purchases/${editingOrder.purchase_id}`
      : "/api/purchases";
    const method = editingOrder ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save order");
      return;
    }

    setShowOrderModal(false);
    await fetchPurchases();
  }

  async function handleDelete(purchaseId: string) {
    setErrorMsg(null);
    const res = await fetch(`/api/purchases/${purchaseId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete order");
      return;
    }
    await fetchPurchases();
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            Orders & VPS Fulfillment Queue
          </h1>
          <p className="text-xs md:text-sm text-neutral-500">
            Fulfill pending WHMCS orders, assign upstream VPS plans and IP addresses, and track real-time net profit.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateOrderModal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          + Create Order
        </button>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap gap-1.5 bg-neutral-200/70 p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`py-2 px-3 rounded-lg transition ${
            tab === "all" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600"
          }`}
        >
          All Orders
        </button>
        <button
          type="button"
          onClick={() => setTab("pending_fulfillment")}
          className={`py-2 px-3 rounded-lg transition ${
            tab === "pending_fulfillment"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-amber-800 hover:bg-amber-100/60"
          }`}
        >
          Pending Fulfillment
        </button>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`py-2 px-3 rounded-lg transition ${
            tab === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-neutral-600"
          }`}
        >
          Active Services
        </button>
        <button
          type="button"
          onClick={() => setTab("due_soon")}
          className={`py-2 px-3 rounded-lg transition ${
            tab === "due_soon" ? "bg-blue-600 text-white shadow-xs" : "text-neutral-600"
          }`}
        >
          Renewals Due (7d)
        </button>
        <button
          type="button"
          onClick={() => setTab("other")}
          className={`py-2 px-3 rounded-lg transition ${
            tab === "other" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600"
          }`}
        >
          Suspended / Other
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm flex justify-between items-center">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Vendor Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <input
          type="text"
          placeholder="Search client, email, IP, hostname, plan..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
        />
        <select
          value={filterVendorId}
          onChange={(e) => setFilterVendorId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
        >
          <option value="">All Upstream Vendors</option>
          {vendors.map((v) => (
            <option key={v.vendor_id} value={v.vendor_id}>
              {v.vendor_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-neutral-500">
          Loading orders...
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-700">
            No orders found for this view.
          </p>
          <p className="text-xs text-neutral-500">
            New orders from WHMCS webhooks will appear here under &ldquo;Pending Fulfillment&rdquo;.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {purchases.map((p) => {
              const profitPositive = BigInt(p.profit_amount_minor) >= 0n;

              return (
                <div
                  key={p.purchase_id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-neutral-900">
                        {p.client_name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {p.client_email}
                      </div>
                      <div className="text-xs font-semibold text-neutral-800 mt-1">
                        {p.display_package_name || "Custom VPS"}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                        p.status === "active"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : p.status === "pending_fulfillment"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {p.status === "pending_fulfillment"
                        ? "Pending Fulfillment"
                        : p.status}
                    </span>
                  </div>

                  <div className="bg-neutral-50 p-2.5 rounded-lg space-y-1.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-neutral-500">IP:</span>{" "}
                        <span className="font-mono font-medium">
                          {p.ip_address || "Not assigned"}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Upstream:</span>{" "}
                        <span className="font-medium">
                          {p.vendor_name || "—"} ({p.vendor_package_name || "—"})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-200/60">
                      <div>
                        <div className="text-[10px] text-neutral-500 uppercase">
                          Retail Sale
                        </div>
                        <div className="font-bold text-neutral-900">
                          {formatMinorToMoney(p.sales_amount_minor, p.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-500 uppercase">
                          Upstream Cost
                        </div>
                        <div className="font-medium text-neutral-700">
                          {formatMinorToMoney(
                            p.purchase_amount_minor,
                            p.currency
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-500 uppercase">
                          Net Profit
                        </div>
                        <div
                          className={`font-bold ${
                            profitPositive
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {profitPositive ? "+" : ""}
                          {formatMinorToMoney(
                            p.profit_amount_minor,
                            p.currency
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <div className="text-neutral-500 text-[11px]">
                      Due: {p.due_date ? p.due_date.slice(0, 10) : "N/A"} •{" "}
                      {p.billing_cycle}
                    </div>

                    <div className="flex gap-2.5">
                      {p.status === "pending_fulfillment" && (
                        <button
                          type="button"
                          onClick={() => openFulfillModal(p)}
                          className="px-2.5 py-1 bg-amber-500 text-white rounded-md font-semibold text-xs hover:bg-amber-600"
                        >
                          Fulfill
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditOrderModal(p)}
                        className="font-semibold text-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.purchase_id)}
                        className="font-semibold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-600 uppercase">
                  <th className="py-3 px-4">Order & Client</th>
                  <th className="py-3 px-4">Retail Plan</th>
                  <th className="py-3 px-4">Status & IP</th>
                  <th className="py-3 px-4">Upstream Vendor Plan</th>
                  <th className="py-3 px-4">Sale / Cost / Fee</th>
                  <th className="py-3 px-4">Net Profit</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {purchases.map((p) => {
                  const profitPositive = BigInt(p.profit_amount_minor) >= 0n;

                  return (
                    <tr key={p.purchase_id} className="hover:bg-neutral-50/60">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">
                          {p.client_name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {p.client_email}
                        </div>
                        {p.whmcs_order_id && (
                          <div className="text-[11px] font-mono text-blue-600">
                            WHMCS Order #{p.whmcs_order_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-neutral-800">
                          {p.display_package_name || "Custom VPS"}
                        </div>
                        <div className="text-neutral-500">
                          {p.billing_cycle}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                            p.status === "active"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : p.status === "pending_fulfillment"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {p.status === "pending_fulfillment"
                            ? "Pending"
                            : p.status}
                        </span>
                        <div className="mt-1 font-mono text-neutral-600">
                          {p.ip_address || "No IP"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {p.vendor_name ? (
                          <div>
                            <div className="font-medium text-neutral-800">
                              {p.vendor_name}
                            </div>
                            <div className="text-neutral-500">
                              {p.vendor_package_name || "Plan"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>
                          <strong>
                            {formatMinorToMoney(
                              p.sales_amount_minor,
                              p.currency
                            )}
                          </strong>
                        </div>
                        <div className="text-neutral-500">
                          Cost:{" "}
                          {formatMinorToMoney(
                            p.purchase_amount_minor,
                            p.currency
                          )}{" "}
                          • Fee:{" "}
                          {formatMinorToMoney(
                            p.processing_charges_minor,
                            p.currency
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold ${
                            profitPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {profitPositive ? "+" : ""}
                          {formatMinorToMoney(
                            p.profit_amount_minor,
                            p.currency
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {p.due_date ? p.due_date.slice(0, 10) : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2.5 text-xs">
                        {p.status === "pending_fulfillment" && (
                          <button
                            type="button"
                            onClick={() => openFulfillModal(p)}
                            className="px-2.5 py-1 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600"
                          >
                            Fulfill
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditOrderModal(p)}
                          className="font-semibold text-neutral-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.purchase_id)}
                          className="font-semibold text-red-600 hover:underline"
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
        </>
      )}

      {/* MODAL: FULFILL ORDER */}
      {fulfillTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Fulfill VPS Order
                </h2>
                <p className="text-xs text-neutral-500">
                  Client: {fulfillTarget.client_name} • Plan:{" "}
                  {fulfillTarget.display_package_name || "Custom VPS"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillTarget(null)}
                className="text-sm text-neutral-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Select Upstream Wholesale Plan (Provisioned From)
                </label>
                <select
                  required
                  value={fulfillVendorPkgId}
                  onChange={(e) =>
                    handleFulfillWholesaleSelect(e.target.value)
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                >
                  <option value="">Select wholesale plan...</option>
                  {wholesalePackages.map((wp) => (
                    <option key={wp.package_id} value={wp.package_id}>
                      {wp.vendor_name} • {wp.package_name} ({wp.iso_code} -{" "}
                      {wp.ram}) @{" "}
                      {formatMinorToMoney(wp.price_minor, wp.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Provisioned IP Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.0.2.1"
                    value={fulfillIp}
                    onChange={(e) => setFulfillIp(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Hostname (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="vps1.client.com"
                    value={fulfillHostname}
                    onChange={(e) => setFulfillHostname(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Actual Upstream Cost *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5.50"
                    value={fulfillCostMajor}
                    onChange={(e) => setFulfillCostMajor(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Processing Charges
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0.50"
                    value={fulfillChargesMajor}
                    onChange={(e) => setFulfillChargesMajor(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Live Profit Calculation Preview */}
              {fulfillLiveProfit && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center text-xs">
                  <span className="text-neutral-600">Calculated Net Profit:</span>
                  <span
                    className={`font-bold text-sm ${
                      fulfillLiveProfit.isPositive
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {fulfillLiveProfit.isPositive ? "+" : ""}
                    {formatMinorToMoney(
                      fulfillLiveProfit.minor,
                      fulfillTarget.currency
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFulfillTarget(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600"
                >
                  Confirm & Mark Active
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT ORDER */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-neutral-900">
                {editingOrder ? "Edit Order" : "New Order"}
              </h2>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-sm text-neutral-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Client *
                  </label>
                  <select
                    required
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c.client_id} value={c.client_id}>
                        {c.client_name} ({c.client_email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Retail Plan
                  </label>
                  <select
                    value={formDisplayPkgId}
                    onChange={(e) =>
                      handleSelectDisplayPackage(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="">Custom / None</option>
                    {displayPackages.map((dp) => (
                      <option
                        key={dp.display_package_id}
                        value={dp.display_package_id}
                      >
                        {dp.package_name} (
                        {formatMinorToMoney(dp.price_minor, dp.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    WHMCS Order ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={formWhmcsOrderId}
                    onChange={(e) => setFormWhmcsOrderId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    WHMCS Service ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 450"
                    value={formWhmcsServiceId}
                    onChange={(e) => setFormWhmcsServiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Retail Sale *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="12.00"
                    value={formSalesMajor}
                    onChange={(e) => setFormSalesMajor(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Upstream Cost
                  </label>
                  <input
                    type="text"
                    placeholder="5.00"
                    value={formCostMajor}
                    onChange={(e) => setFormCostMajor(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Fee
                  </label>
                  <input
                    type="text"
                    placeholder="0.50"
                    value={formChargesMajor}
                    onChange={(e) => setFormChargesMajor(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formCurrency}
                    onChange={(e) =>
                      setFormCurrency(e.target.value.toUpperCase())
                    }
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="pending_fulfillment">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annually">Semi-Annually</option>
                    <option value="annually">Annually</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Assigned IP
                  </label>
                  <input
                    type="text"
                    placeholder="192.0.2.1"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Hostname
                  </label>
                  <input
                    type="text"
                    placeholder="srv1.client.com"
                    value={formHostname}
                    onChange={(e) => setFormHostname(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    placeholder="Stripe / PayPal"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
