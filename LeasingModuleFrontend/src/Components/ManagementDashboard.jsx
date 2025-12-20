import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Percent,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const stripDollar = (v) => (typeof v === "string" ? v.replace(/\$/g, "") : v);

const pct = (num, denom) => {
  const n = Number(num) || 0;
  const d = Number(denom) || 0;
  if (d <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)));
};

const ManagementDashboard = () => {
  const [selectedOccupancyMonth, setSelectedOccupancyMonth] = useState("Dec");
  const [selectedTxnMetric, setSelectedTxnMetric] = useState("MRR");

  // ✅ Short-form mapping + helper
  const PROPERTY_SHORT = {
    PA: "Piramal Agastya (Kurla West, Mumbai)",
    PT: "Piramal Tower (Lower Parel, Mumbai)",
  };
  const shortOffice = (code, officeNo) => `${code}-O${officeNo}`; // PA-O1, PT-O2

  // ✅ Top Stats Cards (Total properties = 2 + add screenshot ones)
  const topStats = [
    {
      label: "Total Properties",
      value: "2",
      change: "+0",
      percentChange: "0%",
      trend: "up",
      icon: Building2,
    },
    {
      label: "Occupancy %",
      value: "92.5%",
      change: "+0.1%",
      percentChange: "+0.1%",
      trend: "up",
      icon: Percent,
      sparkline: true,
    },
    {
      label: "Monthly Rent Due",
      value: "312",
      subtitle: "Collection",
      change: "+1.8%",
      percentChange: "+1.8%",
      trend: "up",
    },
    {
      label: "Rent Collected",
      value: "1.2",
      subtitle: "Rate",
      change: "+0.2",
      percentChange: "+0.2",
      trend: "up",
    },
    {
      label: "Total Receivables",
      value: "36",
      subtitle: "Lease Exposure",
      change: "-2",
      percentChange: "-5.2%",
      trend: "down",
    },
    {
      label: "New Leases",
      value: "YTD",
      subtitle: "YTD",
      change: "+2",
      percentChange: "+2",
      trend: "up",
    },
  ];

  // Leased vs Vacant by Property (ONLY Piramal)
  const propertyMonthlyData = {
    PiramalAgastya: {
      Jan: { leased: 82, vacant: 18 },
      Feb: { leased: 84, vacant: 16 },
      Mar: { leased: 85, vacant: 15 },
      Apr: { leased: 86, vacant: 14 },
      May: { leased: 84, vacant: 16 },
      Jun: { leased: 83, vacant: 17 },
      Jul: { leased: 85, vacant: 15 },
      Aug: { leased: 86, vacant: 14 },
      Sep: { leased: 84, vacant: 16 },
      Oct: { leased: 85, vacant: 15 },
      Nov: { leased: 86, vacant: 14 },
      Dec: { leased: 87, vacant: 13 },
    },
    PiramalTower: {
      Jan: { leased: 74, vacant: 26 },
      Feb: { leased: 76, vacant: 24 },
      Mar: { leased: 75, vacant: 25 },
      Apr: { leased: 77, vacant: 23 },
      May: { leased: 76, vacant: 24 },
      Jun: { leased: 78, vacant: 22 },
      Jul: { leased: 77, vacant: 23 },
      Aug: { leased: 79, vacant: 21 },
      Sep: { leased: 78, vacant: 22 },
      Oct: { leased: 80, vacant: 20 },
      Nov: { leased: 79, vacant: 21 },
      Dec: { leased: 81, vacant: 19 },
    },
  };

  const propertyBase = [
    {
      id: "PiramalAgastya",
      name: PROPERTY_SHORT.PA,
      notes:
        "~69,000 sq ft floorplate • Near BKC & domestic airport • ~10 min from Kurla station",
    },
    {
      id: "PiramalTower",
      name: PROPERTY_SHORT.PT,
      notes:
        "Listed under Peninsula Corporate Park (Piramal Towers) • Walkable to Lower Parel station",
    },
  ];

  const propertyData = propertyBase.map((p) => {
    const m = propertyMonthlyData[p.id]?.[selectedOccupancyMonth] || {
      leased: 0,
      vacant: 0,
    };
    return { ...p, leased: m.leased, vacant: m.vacant };
  });

  // Monthly Rent Data
  const monthlyRentData = [
    { month: "Jan", due: 480, collected: 60 },
    { month: "Feb", due: 480, collected: 200 },
    { month: "Mar", due: 480, collected: 150 },
    { month: "Apr", due: 480, collected: 470 },
    { month: "May", due: 480, collected: 145 },
    { month: "Jun", due: 480, collected: 430 },
    { month: "Jul", due: 480, collected: 210 },
    { month: "Aug", due: 480, collected: 420 },
    { month: "Sep", due: 480, collected: 435 },
    { month: "Oct", due: 480, collected: 445 },
    { month: "Nov", due: 480, collected: 400 },
    { month: "Dec", due: 480, collected: 470 },
  ];

  const maxRent = useMemo(() => {
    const nums = monthlyRentData.flatMap((d) => [d.due, d.collected]);
    return Math.max(1, ...nums);
  }, [monthlyRentData]);

  // Recurring Revenue
  const recurringRevenue = [
    { label: "MRR Growth", value: 72 },
    { label: "Renewal Rate", value: 88 },
    { label: "Collection Rate", value: 91 },
    { label: "CAM Recovery", value: 76 },
    { label: "Occupancy", value: 93 },
    { label: "Avg Lease Term", value: 64 },
  ];

  // ✅ Lease & Portfolio Risk (ONLY Piramal + offices, short form)
  const leaseExpiryData = [
    {
      property: shortOffice("PA", 1),
      current: "39/sqft",
      benchmark: "42/sqft",
      status: "Below Benchmark",
    },
    {
      property: shortOffice("PA", 2),
      current: "41/sqft",
      benchmark: "42/sqft",
      status: "Below Benchmark",
    },
    {
      property: shortOffice("PT", 1),
      current: "46/sqft",
      benchmark: "46/sqft",
      status: "At Benchmark",
      highlight: true,
    },
    {
      property: shortOffice("PT", 2),
      current: "44/sqft",
      benchmark: "46/sqft",
      status: "Below Benchmark",
    },
  ];

  const riskFlags = [
    {
      title: shortOffice("PA", 3),
      badge: "67 Days Vacant",
      meta: "Risk Score: 71",
    },
    {
      title: shortOffice("PA", 4),
      badge: "Renewal in 28 days",
      meta: "Risk Score: 64",
    },
    {
      title: shortOffice("PT", 3),
      badge: "45 Days Vacant",
      meta: "Risk Score: 62",
    },
  ];

  // ✅ AR table (ONLY Piramal + offices, short form)
  const arExpiryData = [
    {
      tenant: shortOffice("PA", 1),
      invoice: "INV-PA-101",
      amount: "₹36.20L",
      due: "2025-12-08",
      days: "3",
      bucket: "₹15,200",
    },
    {
      tenant: shortOffice("PA", 2),
      invoice: "INV-PA-102",
      amount: "₹22.90L",
      due: "2025-12-12",
      days: "7",
      bucket: "₹11,800",
    },
    {
      tenant: shortOffice("PT", 1),
      invoice: "INV-PT-201",
      amount: "₹56.00L",
      due: "2025-12-10",
      days: "3",
      bucket: "₹15,200",
      danger: true,
    },
  ];

  // ✅ Recurring Transactions (NO Arrears)
  const txnMetrics = {
    MRR: {
      key: "MRR",
      label: "MRR",
      amount: "13.0M",
      ytd: { collected: 1.2, due: 13.3 },
      mtd: { collected: 1.22, due: 5.5 },
      hint: "Monthly rent collections tracking",
    },
    CAM: {
      key: "CAM",
      label: "CAM",
      amount: "11.0M",
      ytd: { collected: 8.6, due: 11.2 },
      mtd: { collected: 3.7, due: 4.2 },
      hint: "Common Area Maintenance collections",
    },
  };

  const activeTxn = txnMetrics[selectedTxnMetric] || txnMetrics.MRR;

  // ✅ Bottom 3 tables (ONLY Piramal)
  const upcomingExpiries = [
    {
      tenant: shortOffice("PA", 1),
      property: "PA",
      expiry: "2026-01-31",
      rent: "39/sqft",
      status: "Renewal discussion",
    },
    {
      tenant: shortOffice("PA", 2),
      property: "PA",
      expiry: "2026-02-15",
      rent: "41/sqft",
      status: "Notice pending",
    },
    {
      tenant: shortOffice("PT", 1),
      property: "PT",
      expiry: "2026-03-10",
      rent: "46/sqft",
      status: "At benchmark",
    },
    {
      tenant: shortOffice("PT", 2),
      property: "PT",
      expiry: "2026-03-28",
      rent: "44/sqft",
      status: "Renewal likely",
    },
  ];

  const topOverdueTenants = [
    {
      tenant: shortOffice("PA", 3),
      property: "PA",
      amount: "₹15.2L",
      days: 28,
      bucket: "16–30",
      danger: true,
    },
    {
      tenant: shortOffice("PA", 4),
      property: "PA",
      amount: "₹9.6L",
      days: 17,
      bucket: "16–30",
    },
    {
      tenant: shortOffice("PT", 3),
      property: "PT",
      amount: "₹6.8L",
      days: 9,
      bucket: "1–15",
    },
    {
      tenant: shortOffice("PT", 4),
      property: "PT",
      amount: "₹5.4L",
      days: 7,
      bucket: "1–15",
    },
  ];

  // ✅ Vacant Units Aging (ONLY Piramal, and only these 2)
  const vacantUnitsAging = [
    {
      unit: "Piramal Agastya - L5 (Suite 501)",
      area: "8,200 sqft",
      days: 93,
      asking: "₹38/sqft",
      stage: "61–120",
    },
    {
      unit: "Piramal Tower - 9F (Suite 905)",
      area: "6,100 sqft",
      days: 45,
      asking: "₹46/sqft",
      stage: "31–60",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-[1600px] mx-auto">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-6 gap-2 mb-3">
          {topStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-600">{stat.label}</span>
                {stat.icon && <stat.icon className="w-3 h-3 text-gray-400" />}
              </div>

              <div className="text-lg font-bold text-gray-900 mb-0.5">
                {stripDollar(stat.value)}
              </div>

              {stat.subtitle && (
                <div className="text-[9px] text-gray-500 mb-1">
                  {stat.subtitle}
                </div>
              )}

              <div className="flex items-center gap-1 text-[9px]">
                <span
                  className={`flex items-center gap-0.5 ${
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-2.5 h-2.5" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5" />
                  )}
                  {stripDollar(stat.change)}
                </span>

                {stat.percentChange && (
                  <span
                    className={
                      stat.percentChange.includes("-")
                        ? "text-red-600"
                        : "text-green-600"
                    }
                  >
                    {stripDollar(stat.percentChange)}
                  </span>
                )}

                {stat.sparkline && (
                  <svg className="w-10 h-4 ml-auto" viewBox="0 0 50 20">
                    <polyline
                      points="0,15 10,10 20,12 30,8 40,5 50,3"
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Notes + short forms */}
        <div className="mt-2 mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p className="text-[10px] text-gray-600 leading-snug">
            Data shown is for illustrative purposes. Once correct inputs are
            added, it will reflect here.
          </p>
          <p className="text-[10px] text-gray-600 leading-snug mt-1">
            Short forms: <b>PA</b> = {PROPERTY_SHORT.PA} • <b>PT</b> ={" "}
            {PROPERTY_SHORT.PT} • <b>O1/O2</b> = Office 1/Office 2 (example:{" "}
            <b>PA-O1</b>)
          </p>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Leased vs Vacant by Property */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Leased vs Vacant by Property
              </h2>

              <select
                className="text-[10px] border border-gray-200 rounded px-2 py-1 bg-white"
                value={selectedOccupancyMonth}
                onChange={(e) => setSelectedOccupancyMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {propertyData.map((property) => (
                <div key={property.id}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-700 truncate">
                        {property.name}
                      </div>
                    </div>

                    <div
                      className="shrink-0"
                      title={property.notes}
                      aria-label="Building notes"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>

                  <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
                    <div
                      className="bg-blue-500"
                      style={{ width: `${property.leased}%` }}
                      title={`Leased: ${property.leased}%`}
                    />
                    <div
                      className="bg-orange-400"
                      style={{ width: `${property.vacant}%` }}
                      title={`Vacant: ${property.vacant}%`}
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 mt-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded" />
                  <span>Leased (%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-orange-400 rounded" />
                  <span>Vacant (%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Rent Due vs Collected */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Monthly Rent Due vs Collected
              </h2>
              <span className="text-[10px] text-gray-500">Values in ₹K</span>
            </div>

            <div>
              <div className="flex gap-2 px-2">
                {monthlyRentData.map((item) => (
                  <div
                    key={item.month}
                    className="flex-1 text-center text-[9px] text-gray-500 whitespace-nowrap"
                    title={`Due: ₹${item.due}K | Collected: ₹${item.collected}K`}
                  >
                    {item.due}/{item.collected}
                  </div>
                ))}
              </div>

              <div className="relative h-28 mt-1 px-2">
                <div className="absolute right-2 top-0 bottom-0 w-px bg-gray-200 z-0" />
                <div className="absolute left-2 right-2 bottom-0 h-px bg-gray-200 z-0" />

                <div className="absolute inset-0 px-2 flex items-end gap-2 z-10">
                  {monthlyRentData.map((item) => {
                    const duePct = (item.due / maxRent) * 100;
                    const colPct = (item.collected / maxRent) * 100;

                    return (
                      <div
                        key={item.month}
                        className="flex-1 h-full flex items-end gap-1"
                      >
                        <div className="flex-1 relative h-full">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t"
                            style={{ height: `${duePct}%` }}
                          />
                        </div>

                        <div className="flex-1 relative h-full">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-teal-400 rounded-t"
                            style={{ height: `${colPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 px-2 mt-1">
                {monthlyRentData.map((item) => (
                  <div
                    key={item.month}
                    className="flex-1 text-center text-[10px] text-gray-600"
                  >
                    {item.month}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center mt-3 gap-4 text-[10px] text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded" />
                <span>Rent Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-teal-400 rounded" />
                <span>Rent Collected</span>
              </div>
            </div>
          </div>

          {/* Recurring Revenue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Recurring Revenue
            </h2>

            <div className="space-y-2">
              {recurringRevenue.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 w-24">
                    {stripDollar(item.label)}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${item.value}%` }}
                      title={`${item.value}%`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-700 w-8 text-right">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 mt-3 pt-2 border-t flex-wrap">
              {MONTHS.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div className="flex items-center justify-center mt-1">
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2.5 h-2.5 bg-teal-500 rounded" />
                <span className="text-gray-600">Progress by Metric</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-3 gap-3">
          {/* Lease & Portfolio Risk */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">
              Lease & Portfolio Risk
            </h2>
            <p className="text-[10px] text-gray-500 mb-3">
              Identify and mitigate potential risks across your portfolio.
            </p>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-800">
                  Lease Expiry Pipeline
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-[10px] text-gray-600">
                    Last 180 days (recent)
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-800 mb-2">
                Leases Below Benchmark Rent
              </h3>

              <div className="space-y-2">
                {leaseExpiryData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[10px] py-1"
                  >
                    <span className="text-gray-700">{item.property}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">{item.current}</span>
                      <span className="text-gray-600">vs {item.benchmark}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          item.highlight
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}

                {riskFlags.map((r) => (
                  <div
                    key={r.title}
                    className="flex items-center justify-between text-[10px] py-1"
                  >
                    <span className="text-gray-700">{r.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px]">
                        {r.badge}
                      </span>
                      <span className="text-gray-600">{r.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recurring Transactions (MRR/CAM click) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Recurring Transactions
            </h2>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.values(txnMetrics).map((m) => {
                const active = selectedTxnMetric === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedTxnMetric(m.key)}
                    className={`text-left rounded-md border px-2 py-2 transition ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    title={m.hint}
                  >
                    <div className="text-[10px] text-gray-600 mb-0.5">
                      {m.label}
                    </div>
                    <div className="text-xs font-medium text-gray-900">
                      {m.amount}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-700 mb-1.5">
                {activeTxn.label} Due vs Collected
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="text-[10px] text-gray-600 mb-0.5">
                    YTD Collections
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded"
                        style={{
                          width: `${pct(
                            activeTxn.ytd.collected,
                            activeTxn.ytd.due
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-900">
                      {activeTxn.ytd.collected}M / {activeTxn.ytd.due}M
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-600 mb-0.5">
                    MTD Collections
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded"
                        style={{
                          width: `${pct(
                            activeTxn.mtd.collected,
                            activeTxn.mtd.due
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-900">
                      {activeTxn.mtd.collected}M / {activeTxn.mtd.due}M
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 mt-2 pt-2 border-t flex-wrap">
              {MONTHS.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* AR & Expiry Ladder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              AR & Expiry Ladder (next 24 months)
            </h2>

            {/* ✅ removed Arrears column */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 mb-2">
              <div>MRR</div>
              <div>CAM Revenue</div>
              <div>Avg Days</div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-around text-[10px] text-gray-900 mb-1.5">
                <span>1.90M</span>
                <span>0.80M</span>
                <span>11.0</span>
              </div>
            </div>

            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-800 mb-2">
                MTD Progress
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="text-gray-600 border-b">
                    <tr>
                      <th className="text-left py-1">Tenant</th>
                      <th className="text-left py-1">Invoice</th>
                      <th className="text-left py-1">Amount</th>
                      <th className="text-left py-1">Due Date</th>
                      <th className="text-left py-1">Days</th>
                      <th className="text-left py-1">Age Bucket</th>
                    </tr>
                  </thead>

                  <tbody>
                    {arExpiryData.map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1.5 text-gray-700">{row.tenant}</td>
                        <td className="py-1.5 text-gray-700">{row.invoice}</td>
                        <td className="py-1.5 text-gray-700">{row.amount}</td>
                        <td className="py-1.5 text-gray-700">{row.due}</td>
                        <td className="py-1.5 text-gray-700">{row.days}</td>
                        <td className="py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] ${
                              row.danger
                                ? "bg-red-100 text-red-700 font-medium"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 3 tables BELOW */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {/* Upcoming Expiries */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Upcoming Expiries
              </h2>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th className="text-left py-1">Tenant</th>
                    <th className="text-left py-1">Rent</th>
                    <th className="text-left py-1">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingExpiries.map((r) => (
                    <tr key={r.tenant} className="border-b">
                      <td className="py-1.5 text-gray-700">
                        <div className="font-medium">{r.tenant}</div>
                        <div className="text-gray-500">{r.property}</div>
                      </td>
                      <td className="py-1.5 text-gray-700">{r.rent}</td>
                      <td className="py-1.5 text-gray-700">
                        <div>{r.expiry}</div>
                        <div className="text-gray-500">{r.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Overdue Tenants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Top Overdue Tenants
              </h2>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th className="text-left py-1">Tenant</th>
                    <th className="text-left py-1">Amount</th>
                    <th className="text-left py-1">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {topOverdueTenants.map((r) => (
                    <tr key={r.tenant} className="border-b">
                      <td className="py-1.5 text-gray-700">
                        <div className="font-medium">{r.tenant}</div>
                        <div className="text-gray-500">{r.property}</div>
                      </td>
                      <td className="py-1.5 text-gray-700">{r.amount}</td>
                      <td className="py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] ${
                            r.danger
                              ? "bg-red-100 text-red-700 font-medium"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {r.days}d ({r.bucket})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vacant Units Aging */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Vacant Units Aging
              </h2>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th className="text-left py-1">Unit</th>
                    <th className="text-left py-1">Area</th>
                    <th className="text-left py-1">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {vacantUnitsAging.map((r) => (
                    <tr key={r.unit} className="border-b">
                      <td className="py-1.5 text-gray-700">
                        <div className="font-medium">{r.unit}</div>
                        <div className="text-gray-500">Asking: {r.asking}</div>
                      </td>
                      <td className="py-1.5 text-gray-700">{r.area}</td>
                      <td className="py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 text-gray-700">
                          {r.days}d ({r.stage})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* end bottom tables */}
      </div>
    </div>
  );
};

export default ManagementDashboard;
