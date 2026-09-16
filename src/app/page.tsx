"use client";
"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
// ... rest of your code ...

import { signIn, signOut, useSession } from "next-auth/react";
import { getVerifiedSites, runSiteAudit } from "@/app/actions/gsc";
import {
  CannibalizationIssue,
  StrikingDistanceOpportunity,
} from "@/lib/seo-analyzer";

// Sample SEO dataset for previewing without GSC sites
const SAMPLE_CANNIBALIZATION: CannibalizationIssue[] = [
  {
    query: "best running shoes for beginners",
    totalImpressions: 8420,
    totalClicks: 310,
    severity: "High",
    competingPages: [
      {
        url: "https://mysite.com/blog/best-running-shoes",
        impressions: 4800,
        clicks: 190,
        avgPosition: 4.2,
        impressionShare: 57.0,
      },
      {
        url: "https://mysite.com/guides/beginner-running-footwear",
        impressions: 3620,
        clicks: 120,
        avgPosition: 7.1,
        impressionShare: 43.0,
      },
    ],
  },
  {
    query: "marathon training checklist",
    totalImpressions: 3150,
    totalClicks: 84,
    severity: "Medium",
    competingPages: [
      {
        url: "https://mysite.com/marathon-prep-list",
        impressions: 2100,
        clicks: 62,
        avgPosition: 11.4,
        impressionShare: 66.7,
      },
      {
        url: "https://mysite.com/blog/what-to-pack-for-a-marathon",
        impressions: 1050,
        clicks: 22,
        avgPosition: 15.8,
        impressionShare: 33.3,
      },
    ],
  },
];

const SAMPLE_STRIKING_DISTANCE: StrikingDistanceOpportunity[] = [
  {
    query: "half marathon pacing strategy",
    page: "https://mysite.com/guides/half-marathon-pacing",
    position: 7.8,
    impressions: 9600,
    clicks: 140,
    estimatedTrafficGain: 1300,
  },
  {
    query: "running hydration vest review",
    page: "https://mysite.com/reviews/hydration-vests",
    position: 9.4,
    impressions: 6800,
    clicks: 85,
    estimatedTrafficGain: 935,
  },
  {
    query: "how to prevent shin splints",
    page: "https://mysite.com/recovery/shin-splints-guide",
    position: 12.1,
    impressions: 14200,
    clicks: 110,
    estimatedTrafficGain: 2020,
  },
];

export default function Dashboard() {
  const { data: session, status } = useSession();

  const [sites, setSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [loadingSites, setLoadingSites] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"cannibalization" | "striking">("cannibalization");
  const [searchFilter, setSearchFilter] = useState("");

  const [cannibalizationData, setCannibalizationData] = useState<CannibalizationIssue[]>([]);
  const [strikingData, setStrikingData] = useState<StrikingDistanceOpportunity[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (session) {
      setLoadingSites(true);
      setErrorMsg("");
      getVerifiedSites()
        .then((fetchedSites) => {
          setSites(fetchedSites);
          if (fetchedSites.length > 0) setSelectedSite(fetchedSites[0]);
        })
        .catch(() => setErrorMsg("Could not fetch verified sites. Ensure this account has GSC access."))
        .finally(() => setLoadingSites(false));
    }
  }, [session]);

  const handleRunAudit = async () => {
    if (!selectedSite) return;
    setAnalyzing(true);
    setErrorMsg("");

    try {
      const results = await runSiteAudit(selectedSite);
      setCannibalizationData(results.cannibalization);
      setStrikingData(results.strikingDistance);
      setHasRun(true);
    } catch {
      setErrorMsg("Failed to pull audit. Make sure this site has active Search Console data.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadDemo = () => {
    setSelectedSite("https://example-fitness-site.com (Demo Property)");
    setCannibalizationData(SAMPLE_CANNIBALIZATION);
    setStrikingData(SAMPLE_STRIKING_DISTANCE);
    setHasRun(true);
    setErrorMsg("");
  };

  const highSeverityCount = useMemo(
    () => cannibalizationData.filter((i) => i.severity === "High").length,
    [cannibalizationData]
  );

  const potentialTrafficGain = useMemo(
    () => strikingData.reduce((acc, curr) => acc + curr.estimatedTrafficGain, 0),
    [strikingData]
  );

  const filteredCannibalization = useMemo(
    () =>
      cannibalizationData.filter((item) =>
        item.query.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    [cannibalizationData, searchFilter]
  );

  const filteredStriking = useMemo(
    () =>
      strikingData.filter((item) =>
        item.query.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    [strikingData, searchFilter]
  );

  const exportToCSV = () => {
    if (activeTab === "cannibalization") {
      let csv = "Query,Severity,Total Impressions,Total Clicks,Competing URL,URL Impressions,URL Position,Share (%)\n";
      cannibalizationData.forEach((item) => {
        item.competingPages.forEach((page) => {
          csv += `"${item.query}","${item.severity}",${item.totalImpressions},${item.totalClicks},"${page.url}",${page.impressions},${page.avgPosition},${page.impressionShare}%\n`;
        });
      });
      downloadFile(csv, "cannibalization-report.csv");
    } else {
      let csv = "Query,Page,Position,Impressions,Clicks,Estimated Traffic Gain\n";
      strikingData.forEach((item) => {
        csv += `"${item.query}","${item.page}",${item.position},${item.impressions},${item.clicks},+${item.estimatedTrafficGain}\n`;
      });
      downloadFile(csv, "striking-distance-report.csv");
    }
  };

  const downloadFile = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    a.click();
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-white">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-center">
          <div className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full mb-4 text-xs font-bold uppercase tracking-wider">
            Zero-Cost SEO Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-3">GSC Radar</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Detect internal keyword cannibalization and high-upside striking distance keywords directly from your Google Search Console.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/25"
          >
            Sign In with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
            CR
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-white">GSC Radar</h1>
            <span className="text-[11px] text-slate-400 font-medium">Cannibalization & Opportunity Finder</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 hidden sm:inline bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            {session.user?.email}
          </span>
          <button
            onClick={() => signOut()}
            className="text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 px-3 py-1.5 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Property Selector Card */}
        <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">Select Verified Property</h2>
              <p className="text-xs text-slate-400">
                Choose a connected website or run a demo audit to inspect cannibalization algorithms.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 min-w-[320px]">
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                disabled={loadingSites || analyzing}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {loadingSites ? (
                  <option>Loading your websites...</option>
                ) : sites.length === 0 ? (
                  <option value="">No verified sites on this account</option>
                ) : (
                  sites.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={handleRunAudit}
                disabled={!selectedSite || analyzing}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm whitespace-nowrap"
              >
                {analyzing ? (
                  <>
                    <span className="animate-spin text-sm">⚙️</span>
                    Analyzing...
                  </>
                ) : (
                  "Run Audit"
                )}
              </button>

              <button
                onClick={handleLoadDemo}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl transition text-sm whitespace-nowrap border border-slate-700"
              >
                ⚡ Try Demo Data
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-950/50 border border-red-800/60 text-red-300 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Empty State before running */}
        {!hasRun && !analyzing && (
          <div className="border border-dashed border-slate-800 rounded-3xl p-16 text-center bg-slate-950/40">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white mb-1">No Site Data Loaded</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
              Since this Google account has no verified Search Console properties, click <strong>"Try Demo Data"</strong> above to preview the analysis dashboard and reports.
            </p>
            <button
              onClick={handleLoadDemo}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
            >
              Load Demo Audit
            </button>
          </div>
        )}

        {/* Audit Dashboard Section */}
        {hasRun && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Cannibalized Queries</span>
                <p className="text-2xl font-black text-white mt-1">{cannibalizationData.length}</p>
                <span className="text-[11px] text-slate-500">Multiple URLs fighting</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-red-400 font-medium">High Severity Alerts</span>
                <p className="text-2xl font-black text-red-500 mt-1">{highSeverityCount}</p>
                <span className="text-[11px] text-slate-500">Page 1 ranking split</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-amber-400 font-medium">Striking Distance</span>
                <p className="text-2xl font-black text-amber-500 mt-1">{strikingData.length}</p>
                <span className="text-[11px] text-slate-500">Keywords on rank 7–18</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-emerald-400 font-medium">Est. Traffic Upside</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">+{potentialTrafficGain.toLocaleString()}</p>
                <span className="text-[11px] text-slate-500">Potential monthly clicks</span>
              </div>
            </div>

            {/* Results Table Section */}
            <section className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab("cannibalization")}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "cannibalization"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Cannibalization ({cannibalizationData.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("striking")}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "striking"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Striking Distance ({strikingData.length})
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Filter by keyword..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs px-3.5 py-2 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56"
                  />
                  <button
                    onClick={exportToCSV}
                    className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    📥 Export
                  </button>
                </div>
              </div>

              {/* Cannibalization View */}
              {activeTab === "cannibalization" && (
                <div className="overflow-x-auto">
                  {filteredCannibalization.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 text-xs">
                      No cannibalization alerts found matching your criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Target Keyword</th>
                          <th className="px-6 py-3.5">Severity</th>
                          <th className="px-6 py-3.5">Competing Pages & Position Split</th>
                          <th className="px-6 py-3.5">Action Strategy</th>
                          <th className="px-6 py-3.5 text-right">Impressions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredCannibalization.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="px-6 py-4 font-semibold text-white align-top max-w-xs break-words">
                              {item.query}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.severity === "High"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : item.severity === "Medium"
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {item.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 space-y-2 max-w-lg">
                              {item.competingPages.map((page, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center justify-between p-2 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] gap-2"
                                >
                                  <a
                                    href={page.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:underline truncate max-w-xs"
                                  >
                                    {page.url}
                                  </a>
                                  <div className="flex gap-2 text-slate-400 shrink-0">
                                    <span>Pos: <strong className="text-slate-200">{page.avgPosition}</strong></span>
                                    <span>Share: <strong className="text-slate-200">{page.impressionShare}%</strong></span>
                                  </div>
                                </div>
                              ))}
                            </td>
                            <td className="px-6 py-4 align-top text-[11px] text-slate-400 max-w-xs">
                              {item.severity === "High"
                                ? "Consolidate or 301 redirect the weaker page to the primary URL."
                                : "De-optimize secondary URL's H1/title for this term and link to the primary."}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-white align-top">
                              {item.totalImpressions.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Striking Distance View */}
              {activeTab === "striking" && (
                <div className="overflow-x-auto">
                  {filteredStriking.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 text-xs">
                      No striking-distance opportunities found.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Keyword</th>
                          <th className="px-6 py-3.5">Page URL</th>
                          <th className="px-6 py-3.5">Rank</th>
                          <th className="px-6 py-3.5">Impressions</th>
                          <th className="px-6 py-3.5 text-right">Potential Gain</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredStriking.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="px-6 py-4 font-semibold text-white max-w-xs break-words">
                              {item.query}
                            </td>
                            <td className="px-6 py-4 max-w-md">
                              <a
                                href={item.page}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline truncate block text-[11px]"
                              >
                                {item.page}
                              </a>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                                #{item.position}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                              {item.impressions.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-400">
                              +{item.estimatedTrafficGain} clicks/mo
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}