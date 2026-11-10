"use client";

import React, { useState, useEffect, useCallback } from "react";

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            Clients Management
          </h1>
          <p className="text-xs md:text-sm text-neutral-500">
            Track customers, WHMCS Client IDs, active VPS services, and contact info.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          + Add Client
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

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <input
          type="text"
          placeholder="Search client name, email, company, phone..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-neutral-500">
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-700">
            No clients found.
          </p>
          <p className="text-xs text-neutral-500">
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
                className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-neutral-900">
                        {c.client_name}
                      </span>
                      {c.whmcs_client_id && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                          WHMCS #{c.whmcs_client_id}
                        </span>
                      )}
                    </div>
                    {c.company_name && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {c.company_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      c.status === "active"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : c.status === "inactive"
                        ? "bg-neutral-100 text-neutral-700"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg">
                  <div>
                    <span className="text-neutral-500">Email:</span>{" "}
                    <span className="font-medium">{c.client_email}</span>
                  </div>
                  {c.client_phone && (
                    <div>
                      <span className="text-neutral-500">Phone:</span>{" "}
                      <span className="font-medium">{c.client_phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-500">Orders / Services:</span>{" "}
                    <span className="font-bold text-neutral-900">
                      {c.purchase_count}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="font-semibold text-neutral-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.client_id)}
                    className="font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-600 uppercase">
                  <th className="py-3 px-4">Client & Company</th>
                  <th className="py-3 px-4">WHMCS ID</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {clients.map((c) => (
                  <tr key={c.client_id} className="hover:bg-neutral-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">
                        {c.client_name}
                      </div>
                      {c.company_name && (
                        <div className="text-xs text-neutral-500">
                          {c.company_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {c.whmcs_client_id ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                          #{c.whmcs_client_id}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div>{c.client_email}</div>
                      {c.client_phone && (
                        <div className="text-neutral-500">{c.client_phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          c.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : c.status === "inactive"
                            ? "bg-neutral-100 text-neutral-700"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-neutral-800">
                      {c.purchase_count}
                    </td>
                    <td className="py-3 px-4 text-right space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="font-semibold text-neutral-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.client_id)}
                        className="font-semibold text-red-600 hover:underline"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-neutral-900">
                {editingClient ? "Edit Client" : "New Client"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-neutral-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    WHMCS Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 (optional)"
                    value={whmcsClientId}
                    onChange={(e) => setWhmcsClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select
                    value={clientStatus}
                    onChange={(e) => setClientStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
