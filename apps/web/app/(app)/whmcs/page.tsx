"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Radio, CheckCircle2, AlertCircle, X, Server, Database, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhmcsSyncLog {
  sync_id: string;
  source: string;
  event_type: string;
  external_id: string | null;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface WhmcsStatus {
  has_webhook_secret: boolean;
  has_api_url: boolean;
  has_api_identifier: boolean;
  has_api_secret: boolean;
  api_url: string | null;
}

interface PullResult {
  orders_synced: number;
  clients_upserted: number;
  errors: string[];
}

export default function WhmcsPage() {
  const [logs, setLogs] = useState<WhmcsSyncLog[]>([]);
  const [statusData, setStatusData] = useState<WhmcsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<PullResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whmcs/status");
      const json = await res.json();
      if (json.ok) setStatusData(json.data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/whmcs/sync-logs?limit=50");
      const json = await res.json();
      if (json.ok) setLogs(json.data);
    } catch {
      setErrorMsg("Failed to load WHMCS sync audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchLogs();
  }, [fetchStatus, fetchLogs]);

  async function triggerManualPull() {
    setSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const res = await fetch("/api/whmcs/pull-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });
      const json = await res.json();
      if (json.ok) {
        setSyncResult(json.data);
        await fetchLogs();
      } else {
        setErrorMsg(json.error?.message || "Failed to execute WHMCS pull.");
      }
    } catch {
      setErrorMsg("Network error during WHMCS pull.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            WHMCS Integration & Sync Gateway
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time webhook receiver for new client orders & API pull reconciliation
          </p>
        </div>

        <Button
          type="button"
          onClick={triggerManualPull}
          disabled={syncing}
          className="w-full sm:w-auto cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium gap-1.5"
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Pulling WHMCS Orders..." : "Sync From WHMCS API"}
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-destructive font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {syncResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> WHMCS Sync Completed Successfully
          </div>
          <div className="flex gap-4 pt-1 text-slate-300">
            <span>
              Orders Synced: <strong className="text-white">{syncResult.orders_synced}</strong>
            </span>
            <span>
              Clients Upserted: <strong className="text-white">{syncResult.clients_upserted}</strong>
            </span>
          </div>
          {syncResult.errors.length > 0 && (
            <div className="text-amber-400 pt-1 text-xs">
              Warnings/Errors: {syncResult.errors.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="size-3.5 text-primary" /> 1. Real-Time Webhook
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_webhook_secret ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="font-bold text-sm text-white">
              {statusData?.has_webhook_secret ? "Webhook Active" : "Default Secret"}
            </span>
          </div>
          <div className="text-xs text-sky-400 font-mono bg-slate-950 p-2 rounded-md break-all border border-slate-800">
            /api/webhooks/whmcs
          </div>
          <p className="text-[11px] text-slate-400">
            PHP Hook script is in <code className="font-mono text-slate-300">docs/whmcs-hook/tam_order_sync.php</code>.
          </p>
        </div>

        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Server className="size-3.5 text-sky-400" /> 2. WHMCS External API URL
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_api_url ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
            <span className="font-bold text-sm text-white">
              {statusData?.has_api_url ? "API Configured" : "Not Configured"}
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono bg-slate-950 p-2 rounded-md truncate border border-slate-800">
            {statusData?.api_url || "Set WHMCS_API_URL in .env"}
          </div>
          <p className="text-[11px] text-slate-400">
            Used for manual reconciliation & backfilling past orders.
          </p>
        </div>

        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="size-3.5 text-amber-400" /> 3. API Credentials
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                statusData?.has_api_identifier && statusData?.has_api_secret
                  ? "bg-emerald-400"
                  : "bg-slate-600"
              }`}
            />
            <span className="font-bold text-sm text-white">
              {statusData?.has_api_identifier && statusData?.has_api_secret
                ? "API Credentials Set"
                : "Credentials Missing"}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded-md border border-slate-800">
            WHMCS_API_IDENTIFIER &amp; SECRET
          </div>
          <p className="text-[11px] text-slate-400">
            Configure in WHMCS Admin &gt; Setup &gt; Staff &gt; API Credentials.
          </p>
        </div>
      </div>

      {/* Sync Log History */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            Webhook &amp; Pull Audit Ledger
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="cursor-pointer border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Refresh Logs
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">
            Loading sync audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center space-y-2">
            <Database className="size-8 text-slate-500 mx-auto" />
            <p className="text-sm font-medium text-white">
              No synchronization events yet.
            </p>
            <p className="text-xs text-slate-400">
              When an order is created or status updated in WHMCS, webhook events will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/70 rounded-xl border border-slate-800 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Event &amp; Source</th>
                  <th className="py-3 px-4">Service / Ext ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.sync_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white capitalize">
                        {log.event_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">
                        {log.source === "webhook" ? "⚡ Webhook Push" : "↻ API Pull"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400">
                      {log.external_id ? `#${log.external_id}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          log.status === "processed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : log.status === "failed"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.error_message && (
                        <div className="text-[11px] text-destructive max-w-xs truncate mt-0.5">
                          {log.error_message}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayload(log.payload)}
                        className="font-semibold text-primary hover:underline cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base text-white">
                WHMCS Event Payload
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="cursor-pointer bg-primary text-white hover:bg-primary/90"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
