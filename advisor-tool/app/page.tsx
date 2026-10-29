'use client';

import React, { useState } from 'react';
import { runRobustTaxSimulation, FilingStatus, STATE_TAX_RATES, FreeWithdrawalSchedule } from './taxEngine';
import { runWealthLogixBacktest, BacktestPeriod, BondType } from './bufferEngine';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ShieldCheck, TrendingDown, DollarSign, Users, Sliders, AlertTriangle, 
  Printer, PlayCircle, ChevronRight, CheckCircle2,
  Award, ShieldAlert, Globe, Activity, Landmark, Wallet, Check, Gift, Percent, 
  MapPin, Compass, FileText, Unlock, Briefcase, MessageSquare, ClipboardList, Layers, PieChart, Flame
} from 'lucide-react';

export default function AdvisorTool() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [activeTab, setActiveTab] = useState<'story' | 'backtest' | 'roth' | 'summary'>('story');
  const [backtestMode, setBacktestMode] = useState<'income_fia_vs_portfolio' | 'stocks_fia_vs_6040' | 'equity_vs_fia' | 'fixed_vs_fia'>('income_fia_vs_portfolio');
  const [storyStep, setStoryStep] = useState<1 | 2 | 3>(1);
  const [rothChartMode, setRothChartMode] = useState<'wealth' | 'tax'>('wealth');

  // Accordion Navigation
  const [openSection, setOpenSection] = useState<'client' | 'income' | 'tax' | 'carrier'>('client');

  // Client Demographics & Balances
  const [clientName, setClientName] = useState('John & Mary Smith');
  const [selectedState, setSelectedState] = useState<string>('FL');
  const [currentAge, setCurrentAge] = useState(61);
  const [retirementAge, setRetirementAge] = useState(65);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('mfj');
  const [iraBalance, setIraBalance] = useState(1250000);
  const [rothBalance, setRothBalance] = useState(40000);

  // Pre-Retirement & Post-Retirement Cash Flows
  const [currentEarnedIncome, setCurrentEarnedIncome] = useState(120000);
  const [withdrawalNeed, setWithdrawalNeed] = useState(60000);
  const [socialSecurity, setSocialSecurity] = useState(48000);
  const [fixedIncome, setFixedIncome] = useState(20000);

  // Target Bracket Ceiling
  const [targetBracketCeiling, setTargetBracketCeiling] = useState(403550);
  const [heirsTaxRate, setHeirsTaxRate] = useState(0.28);
  const [taxHikeActive, setTaxHikeActive] = useState(false);

  const stateTaxRate = (STATE_TAX_RATES[selectedState]?.rate ?? 0.00);

  // Carrier Bonus & Tiered Free Withdrawal Schedule
  const [carrierBonusPct, setCarrierBonusPct] = useState(0.12);
  const [freeWithdrawalSchedule, setFreeWithdrawalSchedule] = useState<FreeWithdrawalSchedule>('tiered_2_12');
  const [customFreeWithdrawalPct, setCustomFreeWithdrawalPct] = useState(0.10);

  // Dynamic Paycheck Custom Deposit & Payout Rate
  const [customFiaDeposit, setCustomFiaDeposit] = useState(500000);
  const [incomePayoutRate, setIncomePayoutRate] = useState(0.065);

  // Bond Replacement Strategy Category
  const [selectedBondType, setSelectedBondType] = useState<BondType>('corporate_ig');
  const [applySequenceShock, setApplySequenceShock] = useState(false);

  // FIA Sub-Allocation: 80% S&P 500 / 20% Fixed 3%
  const [fiaIndexedAllocationPct, setFiaIndexedAllocationPct] = useState(0.80);
  const [fiaFixedYieldRate, setFiaFixedYieldRate] = useState(0.03);

  // Backtest Parameters
  const [backtestPeriod, setBacktestPeriod] = useState<BacktestPeriod>('2008_2018');
  const [fiaCap, setFiaCap] = useState(0.095);
  const [fixedRate, setFixedRate] = useState(0.0475);

  const firstName = clientName.split('&')[0].trim() || (lang === 'es' ? 'Cliente' : 'Client');

  const isCardinalComplete = Boolean(
    clientName.trim() && 
    selectedState && 
    currentAge > 0 && 
    retirementAge > currentAge && 
    iraBalance > 0
  );

  const taxAnalysis = runRobustTaxSimulation({
    currentAge,
    retirementAge,
    endAge: 95,
    filingStatus,
    currentEarnedIncome,
    traditionalIra: iraBalance,
    rothBalance,
    taxableBrokerage: 0,
    annualFixedIncome: fixedIncome,
    annualSocialSecurity: socialSecurity,
    annualWithdrawalNeed: withdrawalNeed,
    expectedReturn: 0.065,
    targetBracketCeiling,
    stateCode: selectedState,
    stateTaxRate: stateTaxRate + (taxHikeActive ? 0.04 : 0),
    heirsTaxRate: heirsTaxRate + (taxHikeActive ? 0.05 : 0),
    carrierBonusPct,
    freeWithdrawalSchedule,
    freeWithdrawalPct: customFreeWithdrawalPct,
  });

  const backtest = runWealthLogixBacktest({
    initialDeposit: iraBalance,
    annualWithdrawal: withdrawalNeed,
    period: backtestPeriod,
    bondType: selectedBondType,
    fiaCap,
    fiaFloor: 0.0,
    fiaParticipation: 1.0,
    fixedRate,
    taxRateOnFixed: 0.24,
    fiaIndexedAllocationPct,
    fiaFixedAllocationRate: fiaFixedYieldRate,
    applySequenceShock,
  });

  const effectiveGuaranteedFloorPct = ((1 - fiaIndexedAllocationPct) * fiaFixedYieldRate * 100);

  const formatCurrencyAxis = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${Math.round(v / 1000)}k`;
    return `$${v}`;
  };

  const guaranteedFiaIncome = Math.round(customFiaDeposit * incomePayoutRate);
  const traditional4PctIncome = Math.round(customFiaDeposit * 0.04);
  const annualIncomeAdvantage = guaranteedFiaIncome - traditional4PctIncome;
  const capitalNeededUnder4Pct = Math.round(guaranteedFiaIncome / 0.04);
  const liberatedCapitalForGrowth = Math.max(0, capitalNeededUnder4Pct - customFiaDeposit);
  const playcheckEquitiesRemaining = Math.max(0, iraBalance - customFiaDeposit);

  let simulated6040Bal = customFiaDeposit;
  const incomePaycheckComparison = backtest.results.map((r) => {
    const stockReturn = r.sp500Return / 100;
    const bondReturn = r.selectedBondReturn / 100;
    const blendedReturn = (stockReturn * 0.60) + (bondReturn * 0.40);

    simulated6040Bal = Math.max(0, (simulated6040Bal - guaranteedFiaIncome) * (1 + blendedReturn));
    const dynamic4PctPaycheck = Math.round(Math.max(10000, simulated6040Bal * 0.04));

    return {
      year: r.year,
      calendarYear: r.calendarYear,
      marketReturnPct: Math.round(blendedReturn * 100),
      guaranteedFiaPaycheck: guaranteedFiaIncome,
      traditional6040Paycheck: dynamic4PctPaycheck,
      simulated6040Bal: Math.round(simulated6040Bal),
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans print:p-0 print:bg-white print:text-slate-900">
      
      {/* =========================================================================
          PRINT-ONLY EXECUTIVE DOSSIER (Visible only during window.print())
          ========================================================================= */}
      <div className="hidden print:block w-full max-w-4xl mx-auto space-y-8 font-sans">
        
        {/* PRINT PAGE 1: EXECUTIVE BRIEFING */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Global Financial Impact" className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">The GFI Distribution Blueprint™</h1>
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Strategic Wealth Architecture & Tax Optimization</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-700 space-y-0.5">
              <div><b className="text-slate-900">Client:</b> {clientName}</div>
              <div><b className="text-slate-900">Jurisdiction:</b> {STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}% Tax)</div>
              <div><b className="text-slate-900">Retirement Horizon:</b> Age {retirementAge} (Modeled to Age 95)</div>
            </div>
          </div>

          {/* 4 Stat Highlights */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-slate-300 p-3.5 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Wealth Preserved</div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                ${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Kept in family pocket vs IRS</div>
            </div>

            <div className="border border-slate-300 p-3.5 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avoided Tax Friction</div>
              <div className="text-xl font-black text-slate-900 mt-1">
                ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Avoided RMD tax avalanche</div>
            </div>

            <div className="border border-slate-300 p-3.5 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Heir SECURE 2.0 Shield</div>
              <div className="text-xl font-black text-indigo-700 mt-1">
                ${taxAnalysis.heirSavings.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">10-year inherited tax relief</div>
            </div>

            <div className="border border-slate-300 p-3.5 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Guaranteed Paycheck Floor</div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                ${guaranteedFiaIncome.toLocaleString()}/yr
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Backed by legal 0% floor</div>
            </div>
          </div>

          {/* Executive Summary Matrix */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Strategic Comparison: Traditional Inaction vs. Integrated GFI Plan
              </h2>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Dimension</th>
                  <th className="py-2.5 px-3">Current Path (Traditional 60/40)</th>
                  <th className="py-2.5 px-3">Integrated GFI Plan</th>
                  <th className="py-2.5 px-3 text-right">Net Client Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Lifetime Federal & State Taxes (to Age 95)</td>
                  <td className="py-2.5 px-3">${taxAnalysis.totalBaselineTax.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">${taxAnalysis.totalPlanTax.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">+${taxAnalysis.lifetimeTaxSaved.toLocaleString()} Saved</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Net Effective Conversion Tax Rate</td>
                  <td className="py-2.5 px-3">{taxAnalysis.grossStatutoryRatePct}% (Progressive)</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">{taxAnalysis.overallNetEffectiveTaxRate}%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">-{(carrierBonusPct * 100).toFixed(0)}% Bonus Offset</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Compulsory Mandatory RMDs (Age 73+)</td>
                  <td className="py-2.5 px-3">Subject to peak tax brackets</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-900">$0 (100% Tax-Free Roth)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-700">Protected</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Heir SECURE Act 10-Yr Tax Drag</td>
                  <td className="py-2.5 px-3">${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()} (Forced Liquidation)</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-900">$0 Tax-Free Inherited Base</td>
                  <td className="py-2.5 px-3 text-right font-black text-indigo-700">+${taxAnalysis.heirSavings.toLocaleString()} Sheltered</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Retirement Cash Flow Guarantee</td>
                  <td className="py-2.5 px-3">${traditional4PctIncome.toLocaleString()}/yr (Subject to market drawdowns)</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">${guaranteedFiaIncome.toLocaleString()}/yr (Contractual Floor)</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">+${annualIncomeAdvantage.toLocaleString()}/yr Floor</td>
                </tr>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-900">
                  <td className="py-3 px-3 uppercase tracking-wider text-slate-900">Comprehensive Family Wealth Advantage</td>
                  <td className="py-3 px-3">--</td>
                  <td className="py-3 px-3">--</td>
                  <td className="py-3 px-3 text-right text-emerald-800 text-sm">
                    +${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PRINT PAGE 2: CHARTS & VISUAL TRAJECTORIES */}
        <div className="space-y-6 page-break-before">
          <div className="border-b border-slate-300 pb-2 flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Visual Stress Testing & Wealth Projections</h2>
            <span className="text-[10px] text-slate-500 font-semibold">{clientName} • Client Strategic Report</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Chart 1 */}
            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 avoid-break">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Lifetime Tax Burden: Inaction vs. Plan</h3>
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={taxAnalysis.yearlyData}>
                    <XAxis dataKey="age" stroke="#64748b" tick={{ fontSize: 10, fill: '#1e293b' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#1e293b' }} tickFormatter={formatCurrencyAxis} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="baselineTax" name="Taxes Under Inaction" fill="#dc2626" />
                    <Bar dataKey="planTax" name="Taxes Under Plan" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 avoid-break">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Paychecks vs. 60/40 Market Volatility</h3>
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={incomePaycheckComparison}>
                    <XAxis dataKey="calendarYear" stroke="#64748b" tick={{ fontSize: 10, fill: '#1e293b' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#1e293b' }} tickFormatter={formatCurrencyAxis} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="traditional6040Paycheck" name="4% Rule (Bear Drawdowns)" fill="#dc2626" />
                    <Bar dataKey="guaranteedFiaPaycheck" name="Contractual Paycheck Floor" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tactical Conversion Runway Snippet */}
          <div className="border border-slate-300 rounded-lg overflow-hidden avoid-break">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Tactical Roth Conversion Schedule ($0 Pre-Tax IRA Target)</span>
              <span className="text-[10px] text-slate-600">{(carrierBonusPct * 100).toFixed(0)}% Carrier Bonus Offset Applied</span>
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-2 px-2.5">Age</th>
                  <th className="py-2 px-2.5">Conversion</th>
                  <th className="py-2 px-2.5">Free Allowance</th>
                  <th className="py-2 px-2.5">Taxes Paid</th>
                  <th className="py-2 px-2.5">Gross Rate</th>
                  <th className="py-2 px-2.5 text-emerald-800">Net Rate</th>
                  <th className="py-2 px-2.5">Tax-Free Roth Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {taxAnalysis.yearlyData.filter(d => d.conversionAmount > 0).slice(0, 8).map(d => (
                  <tr key={d.age}>
                    <td className="py-1.5 px-2.5 font-bold">Age {d.age} {d.isWorking ? '(Working)' : '(Retired)'}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-emerald-800">${d.conversionAmount.toLocaleString()}</td>
                    <td className="py-1.5 px-2.5 text-slate-700">${d.maxFreeWithdrawal.toLocaleString()} ({d.maxFreeWithdrawalRatePct}%)</td>
                    <td className="py-1.5 px-2.5 text-rose-800">${d.taxesPaidFromWithdrawal.toLocaleString()}</td>
                    <td className="py-1.5 px-2.5 text-slate-700">{d.statutoryRatePct}%</td>
                    <td className="py-1.5 px-2.5 font-bold text-emerald-800">{d.netEffectiveRatePct}%</td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900">${d.planRoth.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Endorsement & Regulatory Signature Block */}
          <div className="border border-slate-300 p-4 rounded-lg bg-slate-50 space-y-4 avoid-break">
            <div className="text-[10px] text-slate-600 leading-relaxed space-y-1.5">
              <p><b>Important Professional & Legal Disclosures:</b> This presentation is prepared strictly for educational and comparative illustration purposes. Global Financial Impact and its appointed agents are not Certified Public Accountants, tax attorneys, or registered investment advisors. Tax codes, sunset provisions, and statutory exemptions are subject to state and federal legislative change. Clients must review proposed conversion schedules and asset reallocations with their licensed CPA or estate attorney.</p>
              <p>Fixed Indexed Annuities (FIAs) and GLWB income riders are long-term insurance contracts subject to surrender charges, carrier solvency, index participation limits, and contract rules. Past performance of benchmark indices is not a guarantee of future crediting.</p>
            </div>

            <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-800">
              <div className="space-y-6">
                <div>Client Signature: _________________________________________</div>
                <div>Date: ________________________</div>
              </div>
              <div className="space-y-6">
                <div>Licensed Advisor Signature: _______________________________</div>
                <div>License / National Producer #: _____________________________</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          SCREEN-ONLY INTERACTIVE PLATFORM (Hidden during window.print())
          ========================================================================= */}
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">

        {/* Top Header */}
        <header className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-700/60 flex items-center justify-center shrink-0 min-w-[76px] min-h-[48px]">
              <img
                src="/logo.png"
                alt="Global Financial Impact Logo"
                className="h-11 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-logo')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-logo text-xs font-black text-slate-900 tracking-tighter font-sans';
                    fallback.innerText = 'GFI GLOBAL';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                    The GFI Distribution Blueprint
                  </span>
                </span>
                <span className="text-xs bg-sky-500/15 border border-sky-500/40 text-sky-300 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  Tax Optimization & Income Architecture
                </span>
                <span className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                  EDUCATIONAL & INFORMATIONAL MODEL ONLY
                </span>
              </div>
              <div className="text-sm text-slate-300 mt-1.5 space-y-0.5">
                <div>
                  Prepared for: <b className="text-white text-base">{clientName || 'Unnamed Client'}</b> ({STATE_TAX_RATES[selectedState]?.name} • {(stateTaxRate * 100).toFixed(1)}% Tax)
                </div>
                <div>
                  Target Retirement: <b className="text-sky-300">{retirementAge}</b> • <span className="text-emerald-400 font-semibold">Projected to Age 95</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  lang === 'en' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> EN
              </button>
              <button
                onClick={() => setLang('es')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  lang === 'es' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> ES
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            >
              <Printer className="w-4 h-4" /> Print Summary
            </button>

            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('story')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'story' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlayCircle className="w-4 h-4" /> Story Mode
              </button>
              <button
                onClick={() => setActiveTab('backtest')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'backtest' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                GFILogix Backtest
              </button>
              <button
                onClick={() => setActiveTab('roth')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'roth' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Roth Blueprint
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Executive Ledger
              </button>
            </div>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Controls */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 h-fit text-sm">
            
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 text-xs">
                  <ClipboardList className="w-4 h-4 text-emerald-400" /> Client Intake (Cardinal)
                </span>
                {isCardinalComplete ? (
                  <span className="text-xs bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Complete
                  </span>
                ) : (
                  <span className="text-xs bg-rose-500/15 border border-rose-500/40 text-rose-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Incomplete
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fields marked with <span className="text-rose-400 font-bold">*</span> directly calculate living taxes and conversion runways.
              </p>
            </div>

            {/* ALWAYS-VISIBLE FUTURE TAX HIKE TOGGLE */}
            <button
              onClick={() => setTaxHikeActive(!taxHikeActive)}
              className={`w-full py-2.5 px-3 rounded-lg border text-left text-xs transition flex items-center justify-between shadow-sm ${
                taxHikeActive
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Flame className={`w-4 h-4 ${taxHikeActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                <span>Simulate Future Tax Hike (+4% TCJA Sunset)</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
                taxHikeActive ? 'bg-rose-950 border-rose-700 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                {taxHikeActive ? 'ACTIVE' : 'TEST'}
              </span>
            </button>

            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 text-xs">
                <Sliders className="w-4 h-4 text-cyan-400" /> Client Parameters
              </span>
              <select 
                value={filingStatus} 
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs font-bold"
              >
                <option value="mfj">Married Filing Joint</option>
                <option value="single">Single Filer</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setOpenSection('client')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'client' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Intake
              </button>
              <button
                onClick={() => setOpenSection('income')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'income' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setOpenSection('tax')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'tax' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Taxes
              </button>
              <button
                onClick={() => setOpenSection('carrier')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'carrier' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Carrier
              </button>
            </div>

            {/* SECTION 1: INTAKE */}
            {openSection === 'client' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-200 block mb-1 font-semibold flex items-center justify-between text-xs">
                    <span>Client Name(s): <span className="text-rose-400 font-bold">*</span></span>
                    {!clientName.trim() && <span className="text-xs text-rose-400 font-bold">Required</span>}
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    placeholder="e.g. John & Mary Smith"
                    onChange={(e) => setClientName(e.target.value)}
                    className={`w-full bg-slate-800 border rounded-lg p-2.5 text-white font-medium text-sm ${
                      !clientName.trim() ? 'border-rose-500/80 focus:border-rose-400' : 'border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-slate-200 block mb-1 font-semibold flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> State of Residence: <span className="text-rose-400 font-bold">*</span>
                    </span>
                    <span className="text-cyan-400 font-bold text-sm">{(stateTaxRate * 100).toFixed(1)}% Tax</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm"
                  >
                    {Object.entries(STATE_TAX_RATES).map(([code, s]) => (
                      <option key={code} value={code}>
                        {s.name} ({code}) — {(s.rate * 100).toFixed(1)}% Tax
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-200 block mb-1 font-semibold text-xs">
                      Current Age: <span className="text-rose-400 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min={45}
                      max={75}
                      value={currentAge}
                      onChange={(e) => setCurrentAge(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-black text-center text-base"
                    />
                  </div>
                  <div>
                    <label className="text-slate-200 block mb-1 font-semibold text-xs">
                      Target Retirement: <span className="text-rose-400 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={75}
                      value={retirementAge}
                      onChange={(e) => setRetirementAge(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-indigo-400 font-black text-center text-base"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 font-semibold text-xs">
                    <span>Pre-Tax IRA / 401(k): <span className="text-rose-400 font-bold">*</span></span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={5000}
                        value={iraBalance}
                        onChange={(e) => setIraBalance(Number(e.target.value))}
                        className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white font-black text-right text-sm"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="4000000"
                    step="25000"
                    value={iraBalance}
                    onChange={(e) => setIraBalance(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 font-semibold text-xs">
                    <span>Existing Roth IRA:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={rothBalance}
                        onChange={(e) => setRothBalance(Number(e.target.value))}
                        className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-emerald-400 font-black text-right text-sm"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={rothBalance}
                    onChange={(e) => setRothBalance(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: INCOME */}
            {openSection === 'income' && (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span className="flex items-center gap-1 font-bold text-sky-300">
                      <Briefcase className="w-3.5 h-3.5" /> Pre-Retirement Income: <span className="text-rose-400 font-bold">*</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={5000}
                        value={currentEarnedIncome}
                        onChange={(e) => setCurrentEarnedIncome(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sky-400 font-black text-right text-sm"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={currentEarnedIncome}
                    onChange={(e) => setCurrentEarnedIncome(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <span className="text-xs text-slate-400 block mt-1">Pre-retirement tax rate baseline through age {retirementAge}</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span className="font-bold text-emerald-300">Target Retirement Income: <span className="text-rose-400 font-bold">*</span></span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={withdrawalNeed}
                        onChange={(e) => setWithdrawalNeed(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-emerald-400 font-black text-right text-sm"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="200000"
                    step="5000"
                    value={withdrawalNeed}
                    onChange={(e) => setWithdrawalNeed(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* SECTION 3: TAXES */}
            {openSection === 'tax' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-200 block mb-1 font-semibold text-xs">Target Conversion Tax Bracket:</label>
                  <select
                    value={targetBracketCeiling}
                    onChange={(e) => setTargetBracketCeiling(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-bold text-sm"
                  >
                    <option value={100800}>Fill 12% Bracket ($100.8k MFJ / $50.4k Single)</option>
                    <option value={211400}>Fill 22% Bracket ($211.4k MFJ / $105.7k Single)</option>
                    <option value={403550}>Fill 24% Bracket ($403.5k MFJ / $201.7k Single)</option>
                    <option value={512450}>Fill 32% Bracket ($512.4k MFJ / $256.2k Single)</option>
                    <option value={768700}>Fill 35% Bracket ($768.7k MFJ / $640.0k Single)</option>
                    <option value={1500000}>Fill 37% Top Bracket (High Net Worth)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <Gift className="w-3.5 h-3.5" /> Carrier Upfront Bonus:
                    </span>
                    <span className="font-black text-cyan-400 text-sm">
                      {(carrierBonusPct * 100).toFixed(0)}% (+${taxAnalysis.upfrontBonusDollars.toLocaleString()})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.25"
                    step="0.01"
                    value={carrierBonusPct}
                    onChange={(e) => setCarrierBonusPct(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* SECTION 4: CARRIER */}
            {openSection === 'carrier' && (
              <div className="space-y-4 pt-1">
                {/* FIA ALLOCATION SLIDER */}
                <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <PieChart className="w-4 h-4 text-indigo-400" /> FIA Strategy Split
                    </span>
                    <span className="text-emerald-400 font-mono font-black">
                      {(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P / {((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed
                    </span>
                  </div>

                  <div>
                    <input
                      type="range"
                      min="0.50"
                      max="1.00"
                      step="0.05"
                      value={fiaIndexedAllocationPct}
                      onChange={(e) => setFiaIndexedAllocationPct(Number(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>50/50</span>
                      <span className="text-indigo-300 font-bold">80/20 Target</span>
                      <span>100% S&P</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block">Fixed Bucket Rate:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          step={0.25}
                          min={1.0}
                          max={5.0}
                          value={Number((fiaFixedYieldRate * 100).toFixed(2))}
                          onChange={(e) => setFiaFixedYieldRate(Number(e.target.value) / 100)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-xs"
                        />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Guaranteed Floor:</span>
                      <span className="text-emerald-400 font-black text-sm block mt-0.5">
                        +{effectiveGuaranteedFloorPct.toFixed(2)}% / yr
                      </span>
                    </div>
                  </div>
                </div>

                {/* FREE WITHDRAWAL LIQUIDITY SCHEDULE */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <label className="text-slate-200 block font-semibold flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Wallet className="w-3.5 h-3.5" /> Free Withdrawal Liquidity Schedule:
                    </span>
                  </label>
                  <select
                    value={freeWithdrawalSchedule}
                    onChange={(e) => setFreeWithdrawalSchedule(e.target.value as FreeWithdrawalSchedule)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-medium text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="tiered_2_12">
                      American Equity Tiered (2% Yr 1 → 12% Yrs 2–10 → 100% Yr 11+)
                    </option>
                    <option value="standard_10">
                      Standard Industry (0% Yr 1 → 10% Yrs 2–10 → 100% Yr 11+)
                    </option>
                    <option value="flat_10">
                      Flat Allowance (10% Annual Flat)
                    </option>
                  </select>
                </div>

                {/* PAYCHECK CUSTOM DEPOSIT */}
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2.5">
                  <div className="flex justify-between items-center text-slate-200 text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Income FIA Deposit:
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={10000}
                        value={customFiaDeposit}
                        onChange={(e) => setCustomFiaDeposit(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-emerald-400 font-black text-right text-sm"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max={iraBalance || 2000000}
                    step="25000"
                    value={customFiaDeposit}
                    onChange={(e) => setCustomFiaDeposit(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Paychecks: ${customFiaDeposit.toLocaleString()}</span>
                    <span>Playchecks: ${playcheckEquitiesRemaining.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span className="font-semibold">Contractual GLWB Payout Rate:</span>
                    <span className="font-black text-emerald-400 text-sm">{(incomePayoutRate * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.08"
                    step="0.0025"
                    value={incomePayoutRate}
                    onChange={(e) => setIncomePayoutRate(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Right Presentation Dashboard */}
          <div className="lg:col-span-8 space-y-6">

            {/* TAB: ROTH BLUEPRINT */}
            {activeTab === 'roth' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-black text-white text-xl tracking-tight">
                      Roth Blueprint with Full Conversion Runway
                    </h3>
                    <p className="text-sm text-slate-300 mt-0.5">
                      State: <b className="text-cyan-300 font-bold">{STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</b>
                    </p>
                  </div>
                  <span className="text-sm font-black text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-4 py-1.5 rounded-full shadow-sm">
                    Total Lifetime Savings: ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
                  </span>
                </div>

                {/* GRAPH SELECTOR TOGGLE & FIXED CONTAINER */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="text-sm font-bold text-slate-200">
                      {rothChartMode === 'wealth'
                        ? 'Tactical Wealth Transformation (Pre-Tax IRA vs. Tax-Free Roth Growth):'
                        : 'Annual Tax Comparison (Inaction Liability vs. Tax Covered by Contract Free Withdrawals):'
                      }
                    </div>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                      <button
                        onClick={() => setRothChartMode('wealth')}
                        className={`px-3 py-1 rounded font-bold transition ${
                          rothChartMode === 'wealth' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Wealth Progression
                      </button>
                      <button
                        onClick={() => setRothChartMode('tax')}
                        className={`px-3 py-1 rounded font-bold transition ${
                          rothChartMode === 'tax' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Annual Tax Savings
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 310, minHeight: 310 }}>
                    {rothChartMode === 'wealth' ? (
                      <ResponsiveContainer width="100%" height={290} minWidth={0}>
                        <LineChart data={taxAnalysis.yearlyData}>
                          <XAxis dataKey="age" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '4px' }} />
                          <Line type="monotone" dataKey="planIra" name="Pre-Tax IRA Balance (Target: $0)" stroke="#f43f5e" strokeWidth={3} strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="planRoth" name="Tax-Free Roth Balance (Zero RMDs)" stroke="#10b981" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={290} minWidth={0}>
                        <BarChart data={taxAnalysis.yearlyData}>
                          <XAxis dataKey="age" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '4px' }} />
                          <Bar dataKey="baselineTax" name="Taxes Under Inaction" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="planTax" name="Plan Tax (Covered by Free Withdrawal)" fill="#10b981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Conversion Runway Table */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-white">Full Tactical Conversion Runway to $0 IRA Balance</span>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-950 border-b-2 border-slate-800 text-slate-300 text-xs uppercase tracking-wider font-bold">
                        <tr>
                          <th className="py-3 px-2">Age</th>
                          <th className="py-3 px-2">Conversion</th>
                          <th className="py-3 px-2">Free Withdrawal</th>
                          <th className="py-3 px-2">Taxes Paid</th>
                          <th className="py-3 px-2">Gross Rate</th>
                          <th className="py-3 px-2 text-emerald-400">Net Rate</th>
                          <th className="py-3 px-2">Tax-Free Roth Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {taxAnalysis.yearlyData.filter(d => d.conversionAmount > 0).map(d => (
                          <tr key={d.age} className="hover:bg-slate-900/60 transition">
                            <td className="py-3 px-2 font-bold text-white whitespace-nowrap">Age {d.age}</td>
                            <td className="py-3 px-2 text-emerald-400 font-bold whitespace-nowrap">${d.conversionAmount.toLocaleString()}</td>
                            <td className="py-3 px-2 text-slate-300 font-semibold whitespace-nowrap">${d.maxFreeWithdrawal.toLocaleString()} ({d.maxFreeWithdrawalRatePct}%)</td>
                            <td className="py-3 px-2 text-rose-300 font-semibold whitespace-nowrap">${d.taxesPaidFromWithdrawal.toLocaleString()}</td>
                            <td className="py-3 px-2 text-slate-300 whitespace-nowrap">{d.statutoryRatePct}%</td>
                            <td className="py-3 px-2 text-cyan-300 font-black whitespace-nowrap">{d.netEffectiveRatePct}%</td>
                            <td className="py-3 px-2 text-indigo-300 font-bold whitespace-nowrap">${d.planRoth.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STORY MODE */}
            {activeTab === 'story' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                    {storyStep === 1 && <span className="text-rose-400 flex items-center gap-2"><ShieldAlert className="w-6 h-6" /> Act 1: The IRS Tax Avalanche Trap</span>}
                    {storyStep === 2 && <span className="text-emerald-400 flex items-center gap-2"><Award className="w-6 h-6" /> Act 2: The Tactical Roth Discount Runway</span>}
                    {storyStep === 3 && <span className="text-cyan-400 flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Act 3: Paychecks &amp; Playchecks Framework</span>}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setStoryStep(1)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${storyStep === 1 ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300'}`}>1. The Trap</button>
                    <button onClick={() => setStoryStep(2)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${storyStep === 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300'}`}>2. The Solution</button>
                    <button onClick={() => setStoryStep(3)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${storyStep === 3 ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300'}`}>3. Paychecks</button>
                  </div>
                </div>

                {storyStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <span className="text-xs text-slate-400 uppercase font-black tracking-wider">Estimated Total IRS Check</span>
                        <div className="text-3xl font-black text-rose-500">${taxAnalysis.totalBaselineTax.toLocaleString()}</div>
                        <p className="text-xs text-slate-300">Taxes paid from working years through age 95 without conversion planning.</p>
                      </div>
                      <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <span className="text-xs text-slate-400 uppercase font-black tracking-wider">Forced RMD Trigger Age</span>
                        <div className="text-3xl font-black text-white">Age 73</div>
                        <p className="text-xs text-slate-300">Compulsory distributions push you into peak tax brackets.</p>
                      </div>
                      <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <span className="text-xs text-slate-400 uppercase font-black tracking-wider">Social Security Tax Torpedo</span>
                        <div className="text-3xl font-black text-amber-400">Up to 85%</div>
                        <p className="text-xs text-slate-300">Taxable retirement withdrawals cause up to 85% of Social Security benefits to be taxed.</p>
                      </div>
                    </div>

                    <button onClick={() => setStoryStep(2)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                      Step 2: See How We Dismantle This With Roth Conversions <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {storyStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-950/30 border border-emerald-500/50 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-xs text-emerald-400 uppercase font-black tracking-wider">YOUR LIFETIME TAX SAVINGS</span>
                        <div className="text-4xl font-black text-emerald-400">${taxAnalysis.lifetimeTaxSaved.toLocaleString()}</div>
                        <p className="text-xs text-slate-200 font-medium">Front-loading conversions into current lower tax brackets before age 73.</p>
                      </div>
                      <div className="p-5 bg-indigo-950/30 border border-indigo-500/50 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-xs text-indigo-400 uppercase font-black tracking-wider">HEIRS 10-YR TAX SHIELD</span>
                        <div className="text-4xl font-black text-indigo-400">${taxAnalysis.heirSavings.toLocaleString()}</div>
                        <p className="text-xs text-slate-200 font-medium">Preserves wealth your beneficiaries would lose to the 10-year inherited IRA liquidation rule.</p>
                      </div>
                    </div>

                    <button onClick={() => setStoryStep(3)} className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                      Step 3: Secure Your Guaranteed Paychecks &amp; Playchecks <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {storyStep === 3 && (
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="p-5 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-2">
                          <div className="text-xs font-black text-emerald-400 uppercase tracking-wide">Bucket 1: Guaranteed Paychecks (Life Essentials)</div>
                          <div className="text-3xl font-black text-white">${guaranteedFiaIncome.toLocaleString()} / Year</div>
                          <div className="text-xs text-slate-300">Funded by: <b className="text-white">${customFiaDeposit.toLocaleString()}</b> FIA Contract</div>
                        </div>

                        <div className="p-5 bg-sky-950/20 border border-sky-500/40 rounded-xl space-y-2">
                          <div className="text-xs font-black text-sky-400 uppercase tracking-wide">Bucket 2: Playchecks &amp; Growth (Freedom &amp; Family)</div>
                          <div className="text-3xl font-black text-white">${playcheckEquitiesRemaining.toLocaleString()} Invested</div>
                          <div className="text-xs text-slate-300">100% Unencumbered Equities (Growth Engine)</div>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => setActiveTab('summary')} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                      View Executive Takeaway Proposal <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: GFILOGIX BACKTEST STUDIO */}
            {activeTab === 'backtest' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-black text-white text-xl tracking-tight">Paychecks &amp; Playchecks Studio</h3>
                    <p className="text-sm text-slate-300 mt-0.5">Comparing contractual buffer security vs. standard market withdrawal rules</p>
                  </div>

                  <div className="flex flex-wrap bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs gap-1">
                    <button
                      onClick={() => setBacktestMode('stocks_fia_vs_6040')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'stocks_fia_vs_6040' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Bond Replacement (60/40 FIA vs 60/40 Bonds)
                    </button>
                    <button
                      onClick={() => setBacktestMode('income_fia_vs_portfolio')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'income_fia_vs_portfolio' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Paychecks (FIA) vs 60/40
                    </button>
                  </div>
                </div>

                {/* MODE 1: PAYCHECKS (FIA) VS 60/40 */}
                {backtestMode === 'income_fia_vs_portfolio' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-5 rounded-xl border border-emerald-500/40 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">
                          <Wallet className="w-4 h-4" /> GUARANTEED PAYCHECK ADVANTAGE
                        </div>
                        <div className="text-3xl font-black text-white">
                          ${guaranteedFiaIncome.toLocaleString()}/yr
                          <span className="text-sm text-emerald-400 ml-2 font-bold">
                            (+${annualIncomeAdvantage.toLocaleString()}/yr vs. 4% rule)
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Generated from ${customFiaDeposit.toLocaleString()} allocation at a {(incomePayoutRate * 100).toFixed(1)}% contractual rate.
                        </p>
                      </div>

                      <div className="bg-slate-950 p-5 rounded-xl border border-cyan-500/40 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">
                          <Landmark className="w-4 h-4" /> CAPITAL EFFICIENCY (LIBERATED CAPITAL)
                        </div>
                        <div className="text-3xl font-black text-cyan-300">
                          +${liberatedCapitalForGrowth.toLocaleString()} Liberated
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          To generate <b className="text-white">${guaranteedFiaIncome.toLocaleString()}/yr</b> from a conventional 60/40 portfolio safely under the 4% rule, you would have to lock up <b className="text-white">${capitalNeededUnder4Pct.toLocaleString()}</b>. The FIA achieves this with only <b className="text-emerald-400">${customFiaDeposit.toLocaleString()}</b>, leaving <b className="text-cyan-300 font-bold">${liberatedCapitalForGrowth.toLocaleString()}</b> unencumbered to remain 100% invested in equities for family legacy and inflation growth.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUMMARY LEDGER */}
            {activeTab === 'summary' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800 text-slate-300 uppercase tracking-wider text-xs font-bold">
                        <th className="py-3 px-3">Strategic Dimension</th>
                        <th className="py-3 px-3">Current Path (Inaction / 60-40)</th>
                        <th className="py-3 px-3">Integrated GFI Plan</th>
                        <th className="py-3 px-3 text-right">Net Value Delivered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      <tr>
                        <td className="py-3.5 px-3 font-semibold text-white">Lifetime Federal & State Taxes (to Age 95)</td>
                        <td className="py-3.5 px-3">${taxAnalysis.totalBaselineTax.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-bold">${taxAnalysis.totalPlanTax.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">+${taxAnalysis.lifetimeTaxSaved.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 font-semibold text-white">Heir SECURE Act 10-Yr Penalty</td>
                        <td className="py-3.5 px-3">${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-indigo-400 font-bold">$0 (Roth)</td>
                        <td className="py-3.5 px-3 text-right text-indigo-400 font-bold">+${taxAnalysis.heirSavings.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}