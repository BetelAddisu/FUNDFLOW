'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReviewEntry {
  id: string;
  companyName: string;
  sector: string;
  region: string;
  language: 'en' | 'am' | 'om';
  channel: 'web' | 'telegram';
  synthetic: boolean;
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: string; triggered?: boolean; reason?: string }>;
  criterionScores: Array<{
    criterionId: string;
    name: string;
    points: number;
    maxPoints: number;
    reviewFlag?: string;
    evidenceValue?: string;
    reasoning: string;
  }>;
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
  readinessPercentage: number;
  contradiction?: string;
  incompleteFields?: string[];
  metadata: {
    companyName: string;
    businessType: string;
    region: string;
    yearsInOperation: number;
    language: 'en' | 'am' | 'om';
    submissionDate: string;
    licensePhotoUrl?: string;
    workshopPhotoUrl?: string;
  };
  siteVisitQuestions: string[];
}

export default function ReviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'shortlist' | 'eligible' | 'needs_review' | 'excluded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<ReviewEntry | null>(null);
  const [slotsAvailable, setSlotsAvailable] = useState<number>(2);

  useEffect(() => {
    fetchReviewData(slotsAvailable);
  }, [slotsAvailable]);

  const fetchReviewData = (slots: number) => {
    setLoading(true);
    fetch(`/api/review/applications?slots=${slots}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-slate-300 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Reviewer Workstation & Ranking Engine...
        </div>
      </div>
    );
  }

  const { ranked = [], shortlist = [], metrics = {} } = data || {};

  const filteredApps = ranked.filter((app: ReviewEntry) => {
    const matchesSearch =
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'shortlist') return shortlist.some((s: any) => s.id === app.id);
    if (filter === 'eligible') return app.eligible === true;
    if (filter === 'needs_review') return app.eligible === 'needs_review';
    if (filter === 'excluded') return app.eligible === false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-[#111723] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
            ← Main
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <div>
            <h1 className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
              Reviewer Console
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Evaluation Grid
              </span>
            </h1>
          </div>
        </div>

        {/* Shortlist Config Controls */}
        <div className="flex items-center gap-4">
          <div data-testid="synthetic-label" className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-[#172030] border border-slate-700 text-xs text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Synthetic Dataset (12 Applicants)
          </div>

          <div className="flex items-center gap-2 text-xs bg-[#0b0f17] px-3 py-1 rounded border border-slate-800">
            <span className="text-slate-400 font-medium">Award Slots (N):</span>
            <select
              value={slotsAvailable}
              onChange={(e) => setSlotsAvailable(parseInt(e.target.value, 10))}
              className="bg-[#172030] text-white font-bold rounded px-2 py-0.5 border border-slate-700 focus:outline-none"
            >
              <option value={1}>1 (Shortlist: 2)</option>
              <option value={2}>2 (Shortlist: 4)</option>
              <option value={3}>3 (Shortlist: 6)</option>
              <option value={4}>4 (Shortlist: 8)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Metrics Banner */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Received</div>
          <div className="text-xl font-bold text-white">{metrics.totalApplications}</div>
        </div>

        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1 border-l-2 border-l-emerald-500">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Eligible</div>
          <div className="text-xl font-bold text-emerald-400">{metrics.eligibleCount}</div>
        </div>

        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1 border-l-2 border-l-amber-500">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Needs Review</div>
          <div className="text-xl font-bold text-amber-400">{metrics.needsReviewCount}</div>
        </div>

        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1 border-l-2 border-l-rose-500">
          <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Excluded</div>
          <div className="text-xl font-bold text-rose-400">{metrics.excludedCount}</div>
        </div>

        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1 border-l-2 border-l-blue-500">
          <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Shortlist (2× N)</div>
          <div className="text-xl font-bold text-blue-400">{metrics.shortlistCount}</div>
        </div>

        <div className="bg-[#111723] p-3.5 rounded border border-slate-800 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Score (C1-C9)</div>
          <div className="text-xl font-bold text-slate-200">{metrics.averageScoreVariantA} / 100</div>
        </div>
      </div>

      {/* Main Workstation */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#111723] p-4 rounded border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation & Filters</h3>

            <div className="space-y-1 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#172030]'
                }`}
              >
                <span>All Submissions</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{ranked.length}</span>
              </button>

              <button
                onClick={() => setFilter('shortlist')}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                  filter === 'shortlist' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#172030]'
                }`}
              >
                <span className="flex items-center gap-1.5">⭐ Shortlist Candidate</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 font-bold">{shortlist.length}</span>
              </button>

              <button
                onClick={() => setFilter('eligible')}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                  filter === 'eligible' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#172030]'
                }`}
              >
                <span>Fully Eligible</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{metrics.eligibleCount}</span>
              </button>

              <button
                onClick={() => setFilter('needs_review')}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                  filter === 'needs_review' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#172030]'
                }`}
              >
                <span>Needs Review</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{metrics.needsReviewCount}</span>
              </button>

              <button
                onClick={() => setFilter('excluded')}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                  filter === 'excluded' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#172030]'
                }`}
              >
                <span>Excluded</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{metrics.excludedCount}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded bg-[#111723] border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300">Rules & Determinism</div>
            <p className="text-[11px] leading-relaxed">
              Calculated on official 100-point grid. Exclusions rank strictly below eligible entries. Both C7a (Jobs) and C7b (Investment) scores are presented side-by-side.
            </p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by company name, sector, or ID..."
              className="flex-1 bg-[#111723] border border-slate-800 rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-semibold">{filteredApps.length}</span> entries
            </div>
          </div>

          <div className="bg-[#111723] rounded border border-slate-800 overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b0f17] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4">Score (A / B)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredApps.map((app: ReviewEntry, idx: number) => {
                    const isShortlisted = shortlist.some((s: any) => s.id === app.id);
                    return (
                      <tr
                        key={app.id}
                        data-testid={isShortlisted ? 'shortlist-item' : 'ranked-item'}
                        onClick={() => setSelectedApp(app)}
                        className={`hover:bg-[#172030] transition-colors cursor-pointer ${
                          isShortlisted ? 'bg-[#172030]/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-400">
                          <div className="flex items-center gap-1">
                            {isShortlisted && <span>⭐</span>}
                            <span className={isShortlisted ? 'text-blue-400 font-extrabold' : ''}>#{idx + 1}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{app.companyName}</div>
                          <div className="text-[10px] text-slate-500">{app.region} • {app.id}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-300">{app.sector}</td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0b0f17] text-slate-300 border border-slate-800">
                            {app.channel.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              app.eligible === true
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : app.eligible === 'needs_review'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {app.eligible === true ? 'Eligible' : app.eligible === 'needs_review' ? 'Needs Review' : 'Excluded'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {app.totalPointsVariantA} <span className="text-slate-500 text-xs font-normal">/ {app.totalPointsVariantB}</span>
                          </div>
                          <div className="text-[9px] text-slate-500">C7a Jobs vs C7b Invest</div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className="px-2.5 py-1 rounded bg-[#0b0f17] hover:bg-slate-800 text-slate-300 border border-slate-700 font-medium text-xs transition-colors"
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Application Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111723] border border-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-[#0b0f17]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-white">{selectedApp.companyName}</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedApp.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sector: {selectedApp.sector} • Region: {selectedApp.region} • Channel: {selectedApp.channel.toUpperCase()}
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Close ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Contradiction Warning */}
              {selectedApp.contradiction && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <div className="font-semibold text-rose-400 text-xs">⚠️ Contradiction Flagged</div>
                  <p className="leading-relaxed">{selectedApp.contradiction}</p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded bg-[#172030] border border-slate-800 space-y-0.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Score (C7a Employability)</div>
                  <div className="text-xl font-bold text-blue-400">{selectedApp.totalPointsVariantA} / 100</div>
                  <p className="text-[10px] text-slate-500">Includes C7a Employability Jobs variant</p>
                </div>

                <div className="p-3.5 rounded bg-[#172030] border border-slate-800 space-y-0.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Score (C7b Investment)</div>
                  <div className="text-xl font-bold text-slate-200">{selectedApp.totalPointsVariantB} / 100</div>
                  <p className="text-[10px] text-slate-500">Includes C7b Investment Readiness variant</p>
                </div>

                <div className="p-3.5 rounded bg-[#172030] border border-slate-800 space-y-0.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Eligibility Evaluation</div>
                  <div className={`text-base font-bold uppercase ${selectedApp.eligible === true ? 'text-emerald-400' : selectedApp.eligible === 'needs_review' ? 'text-amber-400' : 'text-rose-400'}`}>
                    {selectedApp.eligible === true ? 'Eligible' : selectedApp.eligible === 'needs_review' ? 'Needs Review' : 'Ineligible'}
                  </div>
                  <p className="text-[10px] text-slate-500">E1/E2 Exclusions • E3 Pending</p>
                </div>
              </div>

              {/* Criterion Breakdown Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-1">
                  Evaluation Grid Breakdown (C1 - C9)
                </h3>

                <div className="space-y-2">
                  {selectedApp.criterionScores.map((c) => (
                    <div key={c.criterionId} className="p-3 rounded bg-[#172030] border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{c.criterionId} — {c.name}</span>
                        <div className="flex items-center gap-2">
                          {c.reviewFlag === 'needs_review' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Needs Review
                            </span>
                          )}
                          <span className="font-bold text-blue-400">{c.points} / {c.maxPoints} pts</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{c.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Site Visit Questions */}
              <div className="p-3.5 rounded bg-[#172030] border border-slate-800 space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Open Questions for Physical Verification / Site Visit
                </h3>
                <ul className="space-y-1 text-slate-300 text-xs">
                  {selectedApp.siteVisitQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0b0f17] flex justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}