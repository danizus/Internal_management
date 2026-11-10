"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  formatMinorToMoney,
  parseMajorToMinor,
  minorToMajorInput,
} from "@/lib/money";

interface Country {
  country_id: string;
  country_name: string;
  iso_code: string;
}

interface Vendor {
  vendor_id: string;
  vendor_name: string;
}

interface VendorPackage {
  package_id: string;
  vendor_id: string;
  vendor_name: string;
  country_id: string;
  country_name: string;
  iso_code: string;
  package_name: string;
  cpu_cores: string | null;
  ram: string;
  storage: string;
  operating_system: string;
  bandwidth: string;
  dedicated_ip: string;
  price_minor: string;
  currency: string;
  billing_cycle: string;
}

interface DisplayPackage {
  display_package_id: string;
  whmcs_pid: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  default_vendor_package_id: string | null;
  default_vendor_package_name: string | null;
  upstream_price_minor: string | null;
  upstream_currency: string | null;
  estimated_margin_minor: string | null;
  country_id: string;
  country_name: string;
  iso_code: string;
  package_name: string;
  cpu_cores: string | null;
  ram: string;
  storage: string;
  operating_system: string;
  bandwidth: string;
  dedicated_ip: string;
  price_minor: string;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
}

export default function DisplayPackagesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [wholesalePackages, setWholesalePackages] = useState<VendorPackage[]>(
    []
  );
  const [displayPackages, setDisplayPackages] = useState<DisplayPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [filterCountryId, setFilterCountryId] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<DisplayPackage | null>(null);
  const [whmcsPid, setWhmcsPid] = useState("");
  const [defaultVendorPkgId, setDefaultVendorPkgId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [cpuCores, setCpuCores] = useState("");
  const [ram, setRam] = useState("");
  const [storage, setStorage] = useState("");
  const [os, setOs] = useState("");
  const [bandwidth, setBandwidth] = useState("");
  const [dedicatedIp, setDedicatedIp] = useState("1 IPv4");
  const [priceMajor, setPriceMajor] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [isActive, setIsActive] = useState(true);

  const fetchLookups = useCallback(async () => {
    try {
      const [cRes, vRes, wpRes] = await Promise.all([
        fetch("/api/countries"),
        fetch("/api/vendors"),
        fetch("/api/vendor-packages"),
      ]);
      const [cJson, vJson, wpJson] = await Promise.all([
        cRes.json(),
        vRes.json(),
        wpRes.json(),
      ]);
      if (cJson.ok) setCountries(cJson.data);
      if (vJson.ok) setVendors(vJson.data);
      if (wpJson.ok) setWholesalePackages(wpJson.data);
    } catch {
      setErrorMsg("Failed to load directory lookups.");
    }
  }, []);

  const fetchDisplayPackages = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (filterCountryId) params.set("country_id", filterCountryId);
      if (filterVendorId) params.set("vendor_id", filterVendorId);

      const res = await fetch(`/api/display-packages?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setDisplayPackages(json.data);
      } else {
        setErrorMsg(json.error?.message || "Failed to load retail packages");
      }
    } catch {
      setErrorMsg("Network error while loading retail packages.");
    } finally {
      setLoading(false);
    }
  }, [searchQ, filterCountryId, filterVendorId]);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchDisplayPackages();
  }, [fetchDisplayPackages]);

  const selectedWholesalePkg = useMemo(
    () =>
      wholesalePackages.find((wp) => wp.package_id === defaultVendorPkgId) ||
      null,
    [wholesalePackages, defaultVendorPkgId]
  );

  // Live margin preview in the modal
  const liveMarginPreview = useMemo(() => {
    if (!selectedWholesalePkg) return null;
    const retailMinor = parseMajorToMinor(priceMajor);
    if (retailMinor === null) return null;
    if (
      selectedWholesalePkg.currency.trim().toUpperCase() !==
      currency.trim().toUpperCase()
    ) {
      return {
        mismatch: true,
        text: `Currency mismatch (${currency} vs ${selectedWholesalePkg.currency})`,
        isPositive: false,
      };
    }
    const diff =
      BigInt(retailMinor) - BigInt(selectedWholesalePkg.price_minor);
    return {
      mismatch: false,
      text: `${diff >= 0n ? "+" : ""}${formatMinorToMoney(diff, currency)}`,
      isPositive: diff >= 0n,
    };
  }, [selectedWholesalePkg, priceMajor, currency]);

  function handleSelectWholesalePlan(wpId: string) {
    setDefaultVendorPkgId(wpId);
    const found = wholesalePackages.find((w) => w.package_id === wpId);
    if (found) {
      setVendorId(found.vendor_id);
      setCountryId(found.country_id);
      if (!pkgName.trim()) {
        setPkgName(`${found.iso_code} VPS - ${found.ram}`);
      }
      setCpuCores(found.cpu_cores || "");
      setRam(found.ram);
      setStorage(found.storage);
      setOs(found.operating_system);
      setBandwidth(found.bandwidth);
      setDedicatedIp(found.dedicated_ip);
      setCurrency(found.currency);
      setBillingCycle(found.billing_cycle);
    }
  }

  function openCreateModal() {
    setEditingPkg(null);
    setWhmcsPid("");
    setDefaultVendorPkgId("");
    setVendorId(vendors[0]?.vendor_id || "");
    setCountryId(countries[0]?.country_id || "");
    setPkgName("");
    setCpuCores("2 vCPU");
    setRam("4 GB");
    setStorage("80 GB NVMe");
    setOs("Ubuntu 24.04");
    setBandwidth("20 TB");
    setDedicatedIp("1 IPv4");
    setPriceMajor("");
    setCurrency("USD");
    setBillingCycle("monthly");
    setIsActive(true);
    setShowModal(true);
  }

  function openEditModal(pkg: DisplayPackage) {
    setEditingPkg(pkg);
    setWhmcsPid(pkg.whmcs_pid || "");
    setDefaultVendorPkgId(pkg.default_vendor_package_id || "");
    setVendorId(pkg.vendor_id || "");
    setCountryId(pkg.country_id);
    setPkgName(pkg.package_name);
    setCpuCores(pkg.cpu_cores || "");
    setRam(pkg.ram);
    setStorage(pkg.storage);
    setOs(pkg.operating_system);
    setBandwidth(pkg.bandwidth);
    setDedicatedIp(pkg.dedicated_ip);
    setPriceMajor(minorToMajorInput(pkg.price_minor));
    setCurrency(pkg.currency);
    setBillingCycle(pkg.billing_cycle);
    setIsActive(pkg.is_active);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const priceMinor = parseMajorToMinor(priceMajor);
    if (priceMinor === null) {
      setErrorMsg("Please enter a valid retail price (e.g. 12.50)");
      return;
    }

    const payload = {
      whmcs_pid: whmcsPid.trim() ? whmcsPid.trim() : null,
      vendor_id: vendorId || null,
      default_vendor_package_id: defaultVendorPkgId || null,
      country_id: countryId,
      package_name: pkgName,
      cpu_cores: cpuCores || null,
      ram,
      storage,
      operating_system: os,
      bandwidth,
      dedicated_ip: dedicatedIp,
      price_minor: priceMinor,
      currency,
      billing_cycle: billingCycle,
      is_active: isActive,
    };

    const url = editingPkg
      ? `/api/display-packages/${editingPkg.display_package_id}`
      : "/api/display-packages";
    const method = editingPkg ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save retail package");
      return;
    }

    setShowModal(false);
    await fetchDisplayPackages();
  }

  async function handleDelete(displayPackageId: string) {
    setErrorMsg(null);
    const res = await fetch(`/api/display-packages/${displayPackageId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete retail package");
      return;
    }
    await fetchDisplayPackages();
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            Retail Catalog & Margin Calculator
          </h1>
          <p className="text-xs md:text-sm text-neutral-500">
            Map WHMCS products (<code className="font-mono">whmcs_pid</code>) to upstream wholesale plans and track gross profit margins.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          + Add Retail Plan
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
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <input
          type="text"
          placeholder="Search retail plan, specs, OS, vendor..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
        />
        <select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c.country_id} value={c.country_id}>
              {c.country_name} ({c.iso_code})
            </option>
          ))}
        </select>
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
          Loading retail catalog...
        </div>
      ) : displayPackages.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-neutral-700">
            No retail display packages configured yet.
          </p>
          <p className="text-xs text-neutral-500">
            Click &ldquo;+ Add Retail Plan&rdquo; to map a WHMCS Product ID to an upstream wholesale VPS package.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {displayPackages.map((pkg) => {
              const marginPositive =
                pkg.estimated_margin_minor !== null &&
                BigInt(pkg.estimated_margin_minor) >= 0n;

              return (
                <div
                  key={pkg.display_package_id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-neutral-900">
                          {pkg.package_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                          {pkg.iso_code}
                        </span>
                        {pkg.whmcs_pid ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            WHMCS PID #{pkg.whmcs_pid}
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500">
                            Unmapped PID
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {pkg.country_name} •{" "}
                        {pkg.vendor_name || "Any Vendor"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-neutral-900">
                        {formatMinorToMoney(pkg.price_minor, pkg.currency)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        /{pkg.billing_cycle}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-neutral-500">CPU:</span>{" "}
                      <span className="font-medium">{pkg.cpu_cores || "—"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">RAM:</span>{" "}
                      <span className="font-medium">{pkg.ram}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Storage:</span>{" "}
                      <span className="font-medium">{pkg.storage}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">OS:</span>{" "}
                      <span className="font-medium">{pkg.operating_system}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1 text-xs border-t border-neutral-100">
                    <div>
                      {pkg.default_vendor_package_name &&
                      pkg.upstream_price_minor &&
                      pkg.upstream_currency ? (
                        <div className="space-y-0.5">
                          <div className="text-neutral-500">
                            Upstream:{" "}
                            <strong className="text-neutral-800">
                              {pkg.default_vendor_package_name}
                            </strong>{" "}
                            (
                            {formatMinorToMoney(
                              pkg.upstream_price_minor,
                              pkg.upstream_currency
                            )}
                            )
                          </div>
                          {pkg.estimated_margin_minor !== null && (
                            <div>
                              Est. Margin:{" "}
                              <span
                                className={`font-bold ${
                                  marginPositive
                                    ? "text-emerald-700"
                                    : "text-red-600"
                                }`}
                              >
                                {marginPositive ? "+" : ""}
                                {formatMinorToMoney(
                                  pkg.estimated_margin_minor,
                                  pkg.currency
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">
                          No default wholesale plan linked
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(pkg)}
                        className="font-semibold text-neutral-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(pkg.display_package_id)}
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
                  <th className="py-3 px-4">Retail Plan & WHMCS PID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Specs</th>
                  <th className="py-3 px-4">Retail Price</th>
                  <th className="py-3 px-4">Mapped Upstream Cost</th>
                  <th className="py-3 px-4">Est. Gross Margin</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {displayPackages.map((pkg) => {
                  const marginPositive =
                    pkg.estimated_margin_minor !== null &&
                    BigInt(pkg.estimated_margin_minor) >= 0n;

                  return (
                    <tr
                      key={pkg.display_package_id}
                      className="hover:bg-neutral-50/60"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">
                          {pkg.package_name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {pkg.whmcs_pid ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              PID #{pkg.whmcs_pid}
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400">
                              No WHMCS PID
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-medium">
                          {pkg.iso_code}
                        </span>{" "}
                        <span className="text-neutral-600">
                          {pkg.country_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>
                          <strong>{pkg.cpu_cores || "—"}</strong> •{" "}
                          <strong>{pkg.ram}</strong> • {pkg.storage}
                        </div>
                        <div className="text-neutral-500">
                          {pkg.operating_system} • {pkg.bandwidth}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">
                          {formatMinorToMoney(pkg.price_minor, pkg.currency)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {pkg.billing_cycle}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {pkg.default_vendor_package_name &&
                        pkg.upstream_price_minor &&
                        pkg.upstream_currency ? (
                          <div>
                            <div className="font-medium text-neutral-800">
                              {pkg.default_vendor_package_name} (
                              {pkg.vendor_name || "Vendor"})
                            </div>
                            <div className="text-neutral-500">
                              {formatMinorToMoney(
                                pkg.upstream_price_minor,
                                pkg.upstream_currency
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {pkg.estimated_margin_minor !== null ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-bold ${
                              marginPositive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {marginPositive ? "+" : ""}
                            {formatMinorToMoney(
                              pkg.estimated_margin_minor,
                              pkg.currency
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 text-xs">
                        <button
                          type="button"
                          onClick={() => openEditModal(pkg)}
                          className="font-semibold text-neutral-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pkg.display_package_id)}
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

      {/* MODAL: CREATE / EDIT RETAIL DISPLAY PACKAGE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-neutral-900">
                {editingPkg
                  ? "Edit Retail Display Package"
                  : "New Retail Display Package"}
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
              {/* Upstream Wholesale Mapping & Auto-Copy */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <label className="block font-semibold text-neutral-800">
                  Link Default Wholesale Plan (Auto-fills specs & calculates margin)
                </label>
                <select
                  value={defaultVendorPkgId}
                  onChange={(e) => handleSelectWholesalePlan(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                >
                  <option value="">— None / Choose at fulfillment —</option>
                  {wholesalePackages.map((wp) => (
                    <option key={wp.package_id} value={wp.package_id}>
                      {wp.vendor_name} • {wp.package_name} ({wp.iso_code} -{" "}
                      {wp.ram}) @{" "}
                      {formatMinorToMoney(wp.price_minor, wp.currency)}
                    </option>
                  ))}
                </select>

                {liveMarginPreview && (
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-neutral-600">
                      Estimated Gross Margin:
                    </span>
                    <span
                      className={`font-bold ${
                        liveMarginPreview.mismatch
                          ? "text-amber-700"
                          : liveMarginPreview.isPositive
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {liveMarginPreview.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    WHMCS Product ID (whmcs_pid)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 42 (optional)"
                    value={whmcsPid}
                    onChange={(e) => setWhmcsPid(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Retail Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Germany NVMe VPS 4GB"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Country
                  </label>
                  <select
                    required
                    value={countryId}
                    onChange={(e) => setCountryId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="">Select country...</option>
                    {countries.map((c) => (
                      <option key={c.country_id} value={c.country_id}>
                        {c.country_name} ({c.iso_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Primary Upstream Vendor
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="">Any / Unassigned</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    CPU Cores
                  </label>
                  <input
                    type="text"
                    placeholder="2 vCPU"
                    value={cpuCores}
                    onChange={(e) => setCpuCores(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    RAM
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="4 GB"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Storage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="80 GB NVMe"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    OS
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ubuntu 24.04"
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Bandwidth
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="20 TB"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Dedicated IP
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1 IPv4"
                    value={dedicatedIp}
                    onChange={(e) => setDedicatedIp(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Retail Selling Price
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12.00"
                    value={priceMajor}
                    onChange={(e) => setPriceMajor(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annually">Semi-Annually</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
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
                  Save Retail Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
