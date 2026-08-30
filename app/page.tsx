import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between py-5 border-b border-slate-800 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-base">
            F
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              FUNDflow
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                SME Support Scheme
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/apply"
            className="px-3.5 py-1.5 rounded border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Applicant Intake
          </Link>
          <Link
            href="/review"
            className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Reviewer Workstation →
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <section className="my-auto py-6">
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#172030] border border-slate-700 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Multilingual Support: English • አማርኛ • Afaan Oromoo
          </div>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            AI-Assisted Funding Intake & Defensible Review System
          </h2>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            FUNDflow converts spoken voice notes, text messages, and photos into structured, zero-uncertainty evidence applications — enabling grant reviewers to evaluate and shortlist Ethiopian SMEs on the official 100-point evaluation grid.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/apply"
              className="w-full sm:w-auto px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              Open Applicant Experience (Voice / Text / File)
            </Link>

            <Link
              href="/review"
              className="w-full sm:w-auto px-6 py-3 rounded bg-[#172030] hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Open Reviewer Workstation (12 Fixtures)
            </Link>
          </div>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
          <div className="bg-[#111723] p-5 rounded border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h3 className="text-base font-semibold text-white">4 Input Modes & Dual Channels</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accepts text, live voice recording, uploaded voice audio files, and photo evidence (license & premises) across Web and Telegram.
            </p>
          </div>

          <div className="bg-[#111723] p-5 rounded border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h3 className="text-base font-semibold text-white">Zero-Uncertainty Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict separation between evidence extraction (AI) and deterministic scoring (code). Never turns missing or uncertain data into fact.
            </p>
          </div>

          <div className="bg-[#111723] p-5 rounded border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h3 className="text-base font-semibold text-white">Defensible 2× Shortlist</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides reviewers with C1–C9 breakdown, side-by-side C7a/C7b grid variants, contradiction flags, and site visit verification questions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-5 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          FUNDflow SME Support Scheme • Hackathon 2026
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-slate-400">Addis AI • Gemini • Groq</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Playbook v3</span>
        </div>
      </footer>
    </main>
  );
}