"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  vendor_website: string | null;
  vendor_rating: string;
  vendor_sales_count: number;
  notes: string | null;
  package_count: number;
}

interface VendorPackage {
  package_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_rating: string;
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
  package_sales_count: number;
  is_active: boolean;
}

type ActiveTab = "packages" | "vendors" | "countries";

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("packages");

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Package Filters
  const [searchQ, setSearchQ] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [filterCountryId, setFilterCountryId] = useState("");
  const [filterOs, setFilterOs] = useState("");
  const [filterMaxPriceMajor, setFilterMaxPriceMajor] = useState("");

  // Package Modal State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VendorPackage | null>(
    null
  );
  const [pkgVendorId, setPkgVendorId] = useState("");
  const [pkgCountryId, setPkgCountryId] = useState("");
  const [pkgName, setPkgName] = useState("");
  const [pkgCpu, setPkgCpu] = useState("");
  const [pkgRam, setPkgRam] = useState("");
  const [pkgStorage, setPkgStorage] = useState("");
  const [pkgOs, setPkgOs] = useState("");
  const [pkgBandwidth, setPkgBandwidth] = useState("");
  const [pkgIp, setPkgIp] = useState("1 IPv4");
  const [pkgPriceMajor, setPkgPriceMajor] = useState("");
  const [pkgCurrency, setPkgCurrency] = useState("USD");
  const [pkgCycle, setPkgCycle] = useState("monthly");
  const [pkgActive, setPkgActive] = useState(true);

  // Vendor Modal State
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [vendorWebsite, setVendorWebsite] = useState("");
  const [vendorRating, setVendorRating] = useState("4.5");
  const [vendorNotes, setVendorNotes] = useState("");

  // Country Form State
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [countryName, setCountryName] = useState("");
  const [countryIso, setCountryIso] = useState("");

  const fetchLookups = useCallback(async () => {
    try {
      const [cRes, vRes] = await Promise.all([
        fetch("/api/countries"),
        fetch("/api/vendors"),
      ]);
      const cJson = await cRes.json();
      const vJson = await vRes.json();
      if (cJson.ok) setCountries(cJson.data);
      if (vJson.ok) setVendors(vJson.data);
    } catch {
      setErrorMsg("Failed to load vendors or countries lookup.");
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (filterVendorId) params.set("vendor_id", filterVendorId);
      if (filterCountryId) params.set("country_id", filterCountryId);
      if (filterOs.trim()) params.set("operating_system", filterOs.trim());
      if (filterMaxPriceMajor.trim()) {
        const minor = parseMajorToMinor(filterMaxPriceMajor.trim());
        if (minor) params.set("max_price_minor", minor);
      }

      const res = await fetch(`/api/vendor-packages?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setPackages(json.data);
      } else {
        setErrorMsg(json.error?.message || "Failed to load wholesale packages");
      }
    } catch {
      setErrorMsg("Network error while loading wholesale packages.");
    } finally {
      setLoading(false);
    }
  }, [
    searchQ,
    filterVendorId,
    filterCountryId,
    filterOs,
    filterMaxPriceMajor,
  ]);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  // --- Package Handlers ---
  function openCreatePackageModal() {
    setEditingPackage(null);
    setPkgVendorId(vendors[0]?.vendor_id || "");
    setPkgCountryId(countries[0]?.country_id || "");
    setPkgName("");
    setPkgCpu("2 vCPU");
    setPkgRam("4 GB");
    setPkgStorage("80 GB NVMe");
    setPkgOs("Ubuntu 24.04");
    setPkgBandwidth("20 TB");
    setPkgIp("1 IPv4");
    setPkgPriceMajor("");
    setPkgCurrency("USD");
    setPkgCycle("monthly");
    setPkgActive(true);
    setShowPackageModal(true);
  }

  function openEditPackageModal(pkg: VendorPackage) {
    setEditingPackage(pkg);
    setPkgVendorId(pkg.vendor_id);
    setPkgCountryId(pkg.country_id);
    setPkgName(pkg.package_name);
    setPkgCpu(pkg.cpu_cores || "");
    setPkgRam(pkg.ram);
    setPkgStorage(pkg.storage);
    setPkgOs(pkg.operating_system);
    setPkgBandwidth(pkg.bandwidth);
    setPkgIp(pkg.dedicated_ip);
    setPkgPriceMajor(minorToMajorInput(pkg.price_minor));
    setPkgCurrency(pkg.currency);
    setPkgCycle(pkg.billing_cycle);
    setPkgActive(pkg.is_active);
    setShowPackageModal(true);
  }

  async function handleSavePackage(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const priceMinor = parseMajorToMinor(pkgPriceMajor);
    if (priceMinor === null) {
      setErrorMsg("Please enter a valid price (e.g. 5.99 or 12.00)");
      return;
    }

    const payload = {
      vendor_id: pkgVendorId,
      country_id: pkgCountryId,
      package_name: pkgName,
      cpu_cores: pkgCpu || null,
      ram: pkgRam,
      storage: pkgStorage,
      operating_system: pkgOs,
      bandwidth: pkgBandwidth,
      dedicated_ip: pkgIp,
      price_minor: priceMinor,
      currency: pkgCurrency,
      billing_cycle: pkgCycle,
      is_active: pkgActive,
    };

    const url = editingPackage
      ? `/api/vendor-packages/${editingPackage.package_id}`
      : "/api/vendor-packages";
    const method = editingPackage ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save wholesale package");
      return;
    }
    setShowPackageModal(false);
    await Promise.all([fetchPackages(), fetchLookups()]);
  }

  async function handleDeletePackage(packageId: string) {
    setErrorMsg(null);
    const res = await fetch(`/api/vendor-packages/${packageId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete package");
      return;
    }
    await Promise.all([fetchPackages(), fetchLookups()]);
  }

  // --- Vendor Handlers ---
  function openCreateVendorModal() {
    setEditingVendor(null);
    setVendorName("");
    setVendorWebsite("");
    setVendorRating("4.5");
    setVendorNotes("");
    setShowVendorModal(true);
  }

  function openEditVendorModal(v: Vendor) {
    setEditingVendor(v);
    setVendorName(v.vendor_name);
    setVendorWebsite(v.vendor_website || "");
    setVendorRating(v.vendor_rating);
    setVendorNotes(v.notes || "");
    setShowVendorModal(true);
  }

  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = {
      vendor_name: vendorName,
      vendor_website: vendorWebsite || null,
      vendor_rating: Number(vendorRating),
      notes: vendorNotes || null,
    };

    const url = editingVendor
      ? `/api/vendors/${editingVendor.vendor_id}`
      : "/api/vendors";
    const method = editingVendor ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save vendor");
      return;
    }
    setShowVendorModal(false);
    await Promise.all([fetchLookups(), fetchPackages()]);
  }

  async function handleDeleteVendor(vendorId: string) {
    setErrorMsg(null);
    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete vendor");
      return;
    }
    await fetchLookups();
  }

  // --- Country Handlers ---
  async function handleSaveCountry(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = {
      country_name: countryName,
      iso_code: countryIso.toUpperCase(),
    };
    const url = editingCountry
      ? `/api/countries/${editingCountry.country_id}`
      : "/api/countries";
    const method = editingCountry ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to save country");
      return;
    }
    setEditingCountry(null);
    setCountryName("");
    setCountryIso("");
    await fetchLookups();
  }

  async function handleDeleteCountry(countryId: string) {
    setErrorMsg(null);
    const res = await fetch(`/api/countries/${countryId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      setErrorMsg(json.error?.message || "Failed to delete country");
      return;
    }
    await fetchLookups();
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
            VPS Reseller Directory
          </h1>
          <p className="text-xs md:text-sm text-neutral-500">
            Compare wholesale upstream VPS plans, manage providers, and maintain location lookups.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === "packages" && (
            <button
              type="button"
              onClick={openCreatePackageModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
            >
              + Add Wholesale Plan
            </button>
          )}
          {activeTab === "vendors" && (
            <button
              type="button"
              onClick={openCreateVendorModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
            >
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tabs (Mobile-First) */}
      <div className="grid grid-cols-3 gap-1 bg-neutral-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition ${
            activeTab === "packages"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Wholesale Plans ({packages.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vendors")}
          className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition ${
            activeTab === "vendors"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Vendors ({vendors.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("countries")}
          className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition ${
            activeTab === "countries"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Countries ({countries.length})
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

      {/* TAB 1: WHOLESALE VENDOR PACKAGES */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <input
              type="text"
              placeholder="Search plan, RAM, NVMe, vendor..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
            />
            <select
              value={filterVendorId}
              onChange={(e) => setFilterVendorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>
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
            <input
              type="text"
              placeholder="OS filter (e.g. Ubuntu, Windows)"
              value={filterOs}
              onChange={(e) => setFilterOs(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Max price (e.g. 15.00)"
              value={filterMaxPriceMajor}
              onChange={(e) => setFilterMaxPriceMajor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-sm text-neutral-500">
              Loading wholesale directory...
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-700">
                No wholesale VPS packages found.
              </p>
              <p className="text-xs text-neutral-500">
                First add a Country and a Vendor, then click &ldquo;+ Add Wholesale Plan&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards (< md) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {packages.map((pkg) => (
                  <div
                    key={pkg.package_id}
                    className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900">
                            {pkg.package_name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                            {pkg.iso_code}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {pkg.vendor_name} ★ {pkg.vendor_rating} • {pkg.country_name}
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
                      <div>
                        <span className="text-neutral-500">BW:</span>{" "}
                        <span className="font-medium">{pkg.bandwidth}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">IP:</span>{" "}
                        <span className="font-medium">{pkg.dedicated_ip}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-neutral-500">
                        Active Sales: <strong>{pkg.package_sales_count}</strong>
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => openEditPackageModal(pkg)}
                          className="font-semibold text-neutral-700 hover:text-neutral-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg.package_id)}
                          className="font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block bg-white rounded-xl border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-600 uppercase">
                      <th className="py-3 px-4">Plan & Vendor</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">CPU / RAM / Storage</th>
                      <th className="py-3 px-4">OS / BW / IP</th>
                      <th className="py-3 px-4">Wholesale Cost</th>
                      <th className="py-3 px-4">Sales</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {packages.map((pkg) => (
                      <tr key={pkg.package_id} className="hover:bg-neutral-50/60">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900">
                            {pkg.package_name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {pkg.vendor_name} (★ {pkg.vendor_rating})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-xs font-medium">
                            {pkg.iso_code}
                          </span>{" "}
                          <span className="text-xs text-neutral-600">
                            {pkg.country_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>
                            <strong>{pkg.cpu_cores || "—"}</strong> •{" "}
                            <strong>{pkg.ram}</strong>
                          </div>
                          <div className="text-neutral-500">{pkg.storage}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>{pkg.operating_system}</div>
                          <div className="text-neutral-500">
                            {pkg.bandwidth} • {pkg.dedicated_ip}
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
                        <td className="py-3 px-4 text-xs font-medium">
                          {pkg.package_sales_count}
                        </td>
                        <td className="py-3 px-4 text-right space-x-3 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditPackageModal(pkg)}
                            className="font-semibold text-neutral-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.package_id)}
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
        </div>
      )}

      {/* TAB 2: VENDORS */}
      {activeTab === "vendors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {vendors.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              No upstream vendors added yet. Click &ldquo;+ Add Vendor&rdquo; to add one.
            </div>
          ) : (
            vendors.map((v) => (
              <div
                key={v.vendor_id}
                className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-neutral-900 text-base">
                      {v.vendor_name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      ★ {v.vendor_rating}
                    </span>
                  </div>
                  {v.vendor_website && (
                    <a
                      href={v.vendor_website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline block truncate"
                    >
                      {v.vendor_website}
                    </a>
                  )}
                  {v.notes && (
                    <p className="text-xs text-neutral-600 pt-1">{v.notes}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex justify-between items-center text-xs">
                  <div className="text-neutral-500 space-x-2">
                    <span>
                      Plans: <strong>{v.package_count}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Sales: <strong>{v.vendor_sales_count}</strong>
                    </span>
                  </div>
                  <div className="space-x-3">
                    <button
                      type="button"
                      onClick={() => openEditVendorModal(v)}
                      className="font-semibold text-neutral-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(v.vendor_id)}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: COUNTRIES LOOKUP */}
      {activeTab === "countries" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form
            onSubmit={handleSaveCountry}
            className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 h-fit"
          >
            <h3 className="font-bold text-sm text-neutral-900">
              {editingCountry ? "Edit Country" : "Add Country Lookup"}
            </h3>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Country Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Germany"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                ISO Code (2-3 letters)
              </label>
              <input
                type="text"
                required
                maxLength={3}
                placeholder="e.g. DE"
                value={countryIso}
                onChange={(e) => setCountryIso(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg uppercase"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
              >
                {editingCountry ? "Update Country" : "Save Country"}
              </button>
              {editingCountry && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCountry(null);
                    setCountryName("");
                    setCountryIso("");
                  }}
                  className="py-2 px-3 border border-neutral-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="md:col-span-2 bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
            {countries.length === 0 ? (
              <div className="p-6 text-center text-sm text-neutral-500">
                No countries added yet.
              </div>
            ) : (
              countries.map((c) => (
                <div
                  key={c.country_id}
                  className="p-3.5 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-mono text-xs font-bold">
                      {c.iso_code}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {c.country_name}
                    </span>
                  </div>
                  <div className="space-x-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCountry(c);
                        setCountryName(c.country_name);
                        setCountryIso(c.iso_code);
                      }}
                      className="font-semibold text-neutral-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCountry(c.country_id)}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT WHOLESALE PACKAGE */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-neutral-900">
                {editingPackage ? "Edit Wholesale Plan" : "New Wholesale Plan"}
              </h2>
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="text-sm text-neutral-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Upstream Vendor
                  </label>
                  <select
                    required
                    value={pkgVendorId}
                    onChange={(e) => setPkgVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm"
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Country
                  </label>
                  <select
                    required
                    value={pkgCountryId}
                    onChange={(e) => setPkgCountryId(e.target.value)}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CX22 / KVM NVMe 4G"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    CPU Cores
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 vCPU"
                    value={pkgCpu}
                    onChange={(e) => setPkgCpu(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    RAM
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4 GB"
                    value={pkgRam}
                    onChange={(e) => setPkgRam(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Storage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 80 GB NVMe"
                    value={pkgStorage}
                    onChange={(e) => setPkgStorage(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
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
                    placeholder="Ubuntu / Windows"
                    value={pkgOs}
                    onChange={(e) => setPkgOs(e.target.value)}
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
                    value={pkgBandwidth}
                    onChange={(e) => setPkgBandwidth(e.target.value)}
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
                    value={pkgIp}
                    onChange={(e) => setPkgIp(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Wholesale Price
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5.50"
                    value={pkgPriceMajor}
                    onChange={(e) => setPkgPriceMajor(e.target.value)}
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
                    value={pkgCurrency}
                    onChange={(e) =>
                      setPkgCurrency(e.target.value.toUpperCase())
                    }
                    className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={pkgCycle}
                    onChange={(e) => setPkgCycle(e.target.value)}
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
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT VENDOR */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-neutral-900">
                {editingVendor ? "Edit Vendor" : "New Upstream Vendor"}
              </h2>
              <button
                type="button"
                onClick={() => setShowVendorModal(false)}
                className="text-sm text-neutral-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hetzner / OVH / Vultr"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={vendorWebsite}
                  onChange={(e) => setVendorWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Rating (0.0 to 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={vendorRating}
                  onChange={(e) => setVendorRating(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Support speed, network quality, payment methods..."
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
