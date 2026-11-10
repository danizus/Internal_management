"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Search, Plus, X, Building, Mail, Phone, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Client {
  client_id: string;
  whmcs_client_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  status: string;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [whmcsClientId, setWhmcsClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientStatus, setClientStatus] = useState("active");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setClients(json.data);
      } else {
        setErrorMsg(json.error?.message || "Failed to load clients");
      }
    } catch {
      setErrorMsg("Network error while loading clients.");
    } finally {
      setLoading(false);
    }
  }, [searchQ, filterStatus]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  function openCreateModal() {
    setEditingClient(null);
    setWhmcsClientId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setCompanyName("");
    setClientStatus("active");
    setShowModal(true);
  }

  function openEditModal(c: Client) {
    setEditingClient(c);
    setWhmcsClientId(c.whmcs_client_id || "");
    setClientName(c.client_name);
    setClientEmail(c.client_email);
    setClientPhone(c.client_phone || "");
    setCompanyName(c.company_name || "");
    setClientStatus(c.status);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const payload = {
      whmcs_client_id: whmcsClientId.trim() ? whmcsClientId.trim() : null,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      company_name: companyName || null,
      status: clientStatus,
    };

    const url = editingClient
      ? `/api/clients/${editingClient.client_id}`
      : "/api/clients";
    const method = editingClient ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save client");
      return;
    }

    setShowModal(false);
    await fetchClients();
  }

  async function handleDelete(clientId: string) {
    if (!confirm("Are you sure you want to delete this client?")) return;
    setErrorMsg(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete client");
      return;
    }
    await fetchClients();
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Clients Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track customers, WHMCS Client IDs, active VPS services, and contact info
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium gap-1.5"
        >
          <Plus className="size-4" /> Add Client
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex justify-between items-center">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-destructive font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search client name, email, company, phone..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-800 rounded-lg bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:border-primary/60"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center space-y-2">
          <Users className="size-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-white">
            No clients found.
          </p>
          <p className="text-xs text-slate-400">
            Add a client manually or sync them automatically from WHMCS.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {clients.map((c) => (
              <div
                key={c.client_id}
                className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-white text-base">
                        {c.client_name}
                      </span>
                      {c.whmcs_client_id && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                          WHMCS #{c.whmcs_client_id}
                        </span>
                      )}
                    </div>
                    {c.company_name && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Building className="size-3" /> {c.company_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                      c.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : c.status === "inactive"
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3 text-slate-500 shrink-0" />
                    <span className="text-slate-400">Email:</span>{" "}
                    <span className="font-medium text-white">{c.client_email}</span>
                  </div>
                  {c.client_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-slate-500 shrink-0" />
                      <span className="text-slate-400">Phone:</span>{" "}
                      <span className="font-medium text-white">{c.client_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="size-3 text-slate-500 shrink-0" />
                    <span className="text-slate-400">Orders:</span>{" "}
                    <span className="font-bold text-primary">
                      {c.purchase_count}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.client_id)}
                    className="font-semibold text-destructive hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block bg-slate-900/70 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Client & Company</th>
                  <th className="py-3 px-4">WHMCS ID</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clients.map((c) => (
                  <tr key={c.client_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {c.client_name}
                      </div>
                      {c.company_name && (
                        <div className="text-xs text-slate-400">
                          {c.company_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {c.whmcs_client_id ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          #{c.whmcs_client_id}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="text-slate-200">{c.client_email}</div>
                      {c.client_phone && (
                        <div className="text-slate-400">{c.client_phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : c.status === "inactive"
                            ? "bg-slate-800 text-slate-300 border border-slate-700"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-white">
                      {c.purchase_count}
                    </td>
                    <td className="py-3 px-4 text-right space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.client_id)}
                        className="font-semibold text-destructive hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL: ADD / EDIT CLIENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingClient ? "Edit Client" : "New Client"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    WHMCS Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 (optional)"
                    value={whmcsClientId}
                    onChange={(e) => setWhmcsClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={clientStatus}
                    onChange={(e) => setClientStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm focus:outline-none focus:border-primary/60"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-white rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="cursor-pointer border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium"
                >
                  Save Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
