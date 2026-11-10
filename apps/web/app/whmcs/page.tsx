"use client";

import React, { useState, useEffect, useCallback } from "react";

interface WhmcsConfigStatus {
  has_webhook_secret: boolean;
  has_api_url: boolean;
  has_api_credentials: boolean;
  api_url: string | null;
}

interface SyncLog {
  sync_id: string;
  source: "webhook" | "api_pull";
  event_type: string;
  external_id: string | null;
  payload: Record<string, unknown>;
  status: "processed" | "failed" | "ignored";
  error_message: string | null;
  created_at: string;
}

interface SyncResult {
  orders_synced: number;
  clients_upserted: number;
  errors: string[];
}

export default function WhmcsPage() {
  const [statusData, setStatusData] = useState<WhmcsConfigStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null);

  const fetchStatusAndLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // In production, token is retrieved from session/local storage
      const token = typeof window !== "undefined" ? localStorage.getItem("tam_token") : null;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [statusRes, logsRes] = await Promise.all([
        fetch("/api/whmcs/status", { headers }),
        fetch("/api/whmcs/logs", { headers }),
      ]);

      const [statusJson, logsJson] = await Promise.all([
        statusRes.json(),
        logsRes.json(),
      ]);

      if (statusJson.ok) setStatusData(statusJson.data);
      if (logsJson.ok) setLogs(logsJson.data);
    } catch {
      setErrorMsg("Failed to load WHMCS sync status and logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatusAndLogs();
  }, [fetchStatusAndLogs]);

  async function handleTriggerSync() {
    setSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tam_token") : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch("/api/whmcs/sync", {
        method: "POST",
        headers,
      });

      const json = await res.json();
      if (json.ok) {
        setSyncResult(json.data);
        await fetchStatusAndLogs();
      } else {
        setErrorMsg(json.error?.message || "Sync failed");
      }
    } catch {
      setErrorMsg("Network error while connecting to WHMCS API.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            WHMCS Integration & Sync Center
          </h1>
          <p className="text-xs md:text-sm text-neutral-500">
            Real-time webhook listener and on-demand reconciliation for clients, orders, and services.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerSync}
          disabled={syncing}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <span className="animate-spin">↻</span>
              <span>Syncing with WHMCS...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Sync Orders from WHMCS</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm flex justify-between items-center">
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

      {syncResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs md:text-sm space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>✓</span> WHMCS Sync Completed Successfully
          </div>
          <div className="flex gap-4 pt-1 text-emerald-800">
            <span>
              Orders Synced: <strong>{syncResult.orders_synced}</strong>
            </span>
            <span>
              Clients Upserted: <strong>{syncResult.clients_upserted}</strong>
            </span>
          </div>
          {syncResult.errors.length > 0 && (
            <div className="text-amber-800 pt-1 text-xs">
              Warnings/Errors: {syncResult.errors.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            1. Real-Time Webhook
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_webhook_secret ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="font-bold text-sm text-neutral-900">
              {statusData?.has_webhook_secret ? "Webhook Active" : "Default Secret"}
            </span>
          </div>
          <div className="text-xs text-neutral-500 font-mono bg-neutral-50 p-2 rounded-md break-all">
            /api/webhooks/whmcs
          </div>
          <p className="text-[11px] text-neutral-500">
            PHP Hook script is in <code className="font-mono">docs/whmcs-hook/tam_order_sync.php</code>.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            2. WHMCS External API URL
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_api_url ? "bg-emerald-500" : "bg-neutral-300"
              }`}
            />
            <span className="font-bold text-sm text-neutral-900">
              {statusData?.has_api_url ? "API Configured" : "Not Configured"}
            </span>
          </div>
          <div className="text-xs text-neutral-500 font-mono bg-neutral-50 p-2 rounded-md truncate">
            {statusData?.api_url || "Set WHMCS_API_URL in .env"}
          </div>
          <p className="text-[11px] text-neutral-500">
            Used for manual reconciliation & backfilling past orders.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            3. API Credentials
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_api_credentials ? "bg-emerald-500" : "bg-neutral-300"
              }`}
            />
            <span className="font-bold text-sm text-neutral-900">
              {statusData?.has_api_credentials ? "Credentials Set" : "Missing Credentials"}
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            WHMCS Identifier & Secret authentication.
          </p>
          <p className="text-[11px] text-neutral-500">
            Generate in WHMCS: <em>Setup → System Settings → API Credentials</em>.
          </p>
        </div>
      </div>

      {/* WHMCS Sync / Webhook Logs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-neutral-900">
            Sync & Webhook Audit Logs ({logs.length})
          </h2>
          <button
            type="button"
            onClick={fetchStatusAndLogs}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-semibold"
          >
            ↻ Refresh Logs
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-neutral-500">
            Loading sync logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            No webhook events or sync runs recorded yet. Once orders are placed in WHMCS or you click &ldquo;Sync Orders from WHMCS&rdquo;, events will appear here.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 font-semibold text-neutral-600 uppercase">
                  <th className="py-3 px-4">Event & Source</th>
                  <th className="py-3 px-4">Service / Ext ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {logs.map((log) => (
                  <tr key={log.sync_id} className="hover:bg-neutral-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900 capitalize">
                        {log.event_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">
                        {log.source === "webhook" ? "⚡ Webhook Push" : "↻ API Pull"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      {log.external_id ? `#${log.external_id}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-semibold capitalize ${
                          log.status === "processed"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : log.status === "failed"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.error_message && (
                        <div className="text-[11px] text-red-600 max-w-xs truncate mt-0.5">
                          {log.error_message}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayload(log.payload)}
                        className="font-semibold text-neutral-700 hover:underline"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: VIEW JSON PAYLOAD */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-neutral-900">
                WHMCS Event Payload
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="text-sm font-bold text-neutral-500"
              >
                ✕
              </button>
            </div>
            <pre className="bg-neutral-900 text-neutral-100 p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
