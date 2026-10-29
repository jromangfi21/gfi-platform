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
  MapPin, Compass, FileText, Unlock, Briefcase, MessageSquare, ClipboardList, Layers, PieChart, Flame, CheckSquare, Eye, EyeOff, Clock
} from 'lucide-react';

export default function AdvisorTool() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [activeTab, setActiveTab] = useState<'story' | 'backtest' | 'roth' | 'summary'>('story');
  const [backtestMode, setBacktestMode] = useState<'income_fia_vs_portfolio' | 'stocks_fia_vs_6040' | 'equity_vs_fia' | 'fixed_vs_fia'>('stocks_fia_vs_6040');
  const [storyStep, setStoryStep] = useState<1 | 2 | 3>(1);
  const [rothChartMode, setRothChartMode] = useState<'wealth' | 'tax'>('wealth');

  // Toggle Advisor Notes / Food for Thought Visibility
  const [showAdvisorNotes, setShowAdvisorNotes] = useState(true);

  // Accordion Navigation — Defaults directly to 'client' (Intake)
  const [openSection, setOpenSection] = useState<'client' | 'income' | 'tax' | 'carrier'>('client');

  // Client Demographics & Balances (Cardinal Fields)
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

  // Target Bracket Ceiling & Stress Toggles
  const [targetBracketCeiling, setTargetBracketCeiling] = useState(403550);
  const [heirsTaxRate, setHeirsTaxRate] = useState(0.28);
  const [taxHikeActive, setTaxHikeActive] = useState(false);
  const [applySequenceShock, setApplySequenceShock] = useState(false);

  // Dual Fee Controls: AUM Fee (Market/Equities) & FIA Rider Fee (Annuity)
  const [aumFeePct, setAumFeePct] = useState(0.010); // 1.00% Advisory Fee
  const [annuityFeePct, setAnnuityFeePct] = useState(0.010); // 1.00% FIA Rider Fee
  const [feeDuration, setFeeDuration] = useState<'ten_years' | 'life'>('life');

  const stateTaxRate = (STATE_TAX_RATES[selectedState]?.rate ?? 0.00);

  // Carrier Bonus & Tiered Free Withdrawal Schedule
  const [carrierBonusPct, setCarrierBonusPct] = useState(0.12);
  const [freeWithdrawalSchedule, setFreeWithdrawalSchedule] = useState<FreeWithdrawalSchedule>('tiered_2_12');
  const [customFreeWithdrawalPct, setCustomFreeWithdrawalPct] = useState(0.10);

  // Dynamic Paycheck Custom Deposit & Payout Rate
  const [customFiaDeposit, setCustomFiaDeposit] = useState(500000);
  const [incomePayoutRate, setIncomePayoutRate] = useState(0.065);

  // Market Asset Class Comparison
  const [selectedBondType, setSelectedBondType] = useState<BondType>('corporate_ig');

  // FIA Sub-Allocation: 80% S&P 500 / 20% Fixed 3%
  const [fiaIndexedAllocationPct, setFiaIndexedAllocationPct] = useState(0.80);
  const [fiaFixedYieldRate, setFiaFixedYieldRate] = useState(0.03);

  // Backtest Parameters & Cap Rate Adjuster
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

  // Net baseline market expected return net of AUM fee
  const netExpectedReturn = Math.max(0.01, 0.065 - aumFeePct);

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
    expectedReturn: netExpectedReturn,
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

  // Dynamic Paycheck vs. Playcheck Calculations
  const guaranteedFiaIncome = Math.round(customFiaDeposit * incomePayoutRate);
  const traditional4PctIncome = Math.round(customFiaDeposit * 0.04);
  const annualIncomeAdvantage = guaranteedFiaIncome - traditional4PctIncome;
  const capitalNeededUnder4Pct = Math.round(guaranteedFiaIncome / 0.04);
  const liberatedCapitalForGrowth = Math.max(0, capitalNeededUnder4Pct - customFiaDeposit);
  const playcheckEquitiesRemaining = Math.max(0, iraBalance - customFiaDeposit);

  // Recalculate backtest balances with both AUM fee & FIA rider fee
  let netTrad6040Bal = iraBalance;
  let netModernFiaBal = iraBalance;
  let netEquityBal = iraBalance;
  let netFiaBal = iraBalance;
  let simulated6040Bal = customFiaDeposit;

  const feeAdjustedBacktestResults = backtest.results.map((r, index) => {
    const isFiaFeeActive = feeDuration === 'life' || index < 10;
    const currentFiaFee = isFiaFeeActive ? annuityFeePct : 0.0;

    // 1. Traditional 60/40 Return: Net of AUM Fee
    const raw6040Return = ((r.sp500Return / 100) * 0.60) + ((r.selectedBondReturn / 100) * 0.40);
    const net6040Return = raw6040Return - aumFeePct;

    // 2. Pure Equities Return: Net of AUM Fee
    const netEquityReturn = (r.sp500Return / 100) - aumFeePct;

    // 3. FIA Return: S&P indexed (capped/floored) + Fixed sleeve, net of FIA fee
    const indexedPortion = Math.max(0, Math.min(fiaCap, r.sp500Return / 100));
    const fixedPortion = fiaFixedYieldRate;
    const fiaGrossReturn = (indexedPortion * fiaIndexedAllocationPct) + (fixedPortion * (1 - fiaIndexedAllocationPct));
    const netFiaReturn = fiaGrossReturn - currentFiaFee;

    // 4. Modernized 60/40: 60% Equities (net of AUM) + 40% FIA (net of FIA fee)
    const netModernReturn = (netEquityReturn * 0.60) + (netFiaReturn * 0.40);

    // Update ongoing accumulation balances
    netTrad6040Bal = Math.max(0, (netTrad6040Bal - withdrawalNeed) * (1 + net6040Return));
    netModernFiaBal = Math.max(0, (netModernFiaBal - withdrawalNeed) * (1 + netModernReturn));
    netEquityBal = Math.max(0, netEquityBal * (1 + netEquityReturn));
    netFiaBal = Math.max(0, netFiaBal * (1 + netFiaReturn));

    // Paychecks comparison calculation
    simulated6040Bal = Math.max(0, (simulated6040Bal - guaranteedFiaIncome) * (1 + net6040Return));
    const dynamic4PctPaycheck = Math.round(Math.max(10000, simulated6040Bal * 0.04));

    return {
      ...r,
      traditional6040Balance: Math.round(netTrad6040Bal),
      modernized6040FiaBalance: Math.round(netModernFiaBal),
      equityBalance: Math.round(netEquityBal),
      fiaBalance: Math.round(netFiaBal),
      marketReturnPct: Math.round(net6040Return * 100),
      guaranteedFiaPaycheck: guaranteedFiaIncome,
      traditional6040Paycheck: dynamic4PctPaycheck,
      simulated6040Bal: Math.round(simulated6040Bal),
      appliedFiaFeePct: Number((currentFiaFee * 100).toFixed(2)),
      appliedAumFeePct: Number((aumFeePct * 100).toFixed(2)),
    };
  });

  // Hoisted explicitly into component scope to guarantee availability everywhere
  const finalModern6040 = feeAdjustedBacktestResults.length > 0
    ? feeAdjustedBacktestResults[feeAdjustedBacktestResults.length - 1].modernized6040FiaBalance
    : 0;

  const finalTrad6040 = feeAdjustedBacktestResults.length > 0
    ? feeAdjustedBacktestResults[feeAdjustedBacktestResults.length - 1].traditional6040Balance
    : 0;

  const finalFiaOnly = feeAdjustedBacktestResults.length > 0
    ? feeAdjustedBacktestResults[feeAdjustedBacktestResults.length - 1].fiaBalance
    : 0;

  const finalEquityOnly = feeAdjustedBacktestResults.length > 0
    ? feeAdjustedBacktestResults[feeAdjustedBacktestResults.length - 1].equityBalance
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans print:p-0 print:bg-white print:text-slate-900">
      
      {/* =========================================================================
          PRINT-ONLY EXECUTIVE DOSSIER
          ========================================================================= */}
      <div className="hidden print:block w-full max-w-4xl mx-auto space-y-6 font-sans">
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Global Financial Impact" className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">The GFI Distribution Blueprint™</h1>
                <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">Strategic Wealth Architecture & Tax Optimization</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-700 space-y-0.5">
              <div><b className="text-slate-900">Prepared For:</b> {clientName}</div>
              <div><b className="text-slate-900">Jurisdiction:</b> {STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}% Tax)</div>
              <div><b className="text-slate-900">Retirement Horizon:</b> Age {retirementAge} (Modeled through Age 95)</div>
            </div>
          </div>

          <div className="border border-slate-300 p-4 rounded-lg bg-slate-50 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Executive Briefing & Strategic Narrative</h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              This customized blueprint establishes a bifurcated <b>Paychecks & Playchecks</b> architecture designed to resolve the two greatest hazards facing your retirement: <i>Sequence-of-Returns risk</i> during market decumulation, and the <i>compulsory IRS tax trap</i> triggered by mandatory RMDs and the SECURE Act 2.0. By strategically isolating guaranteed living requirements into contractual income instruments and converting pre-tax liabilities into compounding tax-free Roth reserves, your family eliminates liquidation panic while locking in an unencumbered equity growth engine.
            </p>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700" /> Key Strategic Accomplishments
              </h2>
            </div>
            <div className="p-3.5 bg-white grid grid-cols-2 gap-2.5 text-xs text-slate-800">
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold text-sm leading-none">☑</span>
                <span><b>Sequence-of-Returns Immunity:</b> Essential annual lifestyle cash flow is legally defended by a contractual 0% floor and guaranteed income rider.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold text-sm leading-none">☑</span>
                <span><b>RMD Tax Avalanche Neutralized:</b> Pre-tax IRA balance systematically reduced to $0, preventing compulsory peak bracket distributions at age 73+.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold text-sm leading-none">☑</span>
                <span><b>Heir SECURE Act 2.0 Protection:</b> Liquidated inherited account drag eliminated, leaving beneficiaries with 100% tax-exempt legacy transfers.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold text-sm leading-none">☑</span>
                <span><b>Fee Transparency:</b> Factored {(aumFeePct * 100).toFixed(2)}% AUM management fee on market portfolios alongside {(annuityFeePct * 100).toFixed(2)}% contract fee ({feeDuration === 'ten_years' ? 'First 10 Yrs' : 'Life'}).</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Wealth Saved</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                ${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Retained in family control</div>
            </div>

            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avoided Tax Friction</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Averted RMD surtaxes</div>
            </div>

            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Heir Tax Shield</div>
              <div className="text-lg font-black text-indigo-700 mt-0.5">
                ${taxAnalysis.heirSavings.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">SECURE 2.0 sheltered</div>
            </div>

            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Guaranteed Paycheck</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                ${guaranteedFiaIncome.toLocaleString()}/yr
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Contractual life floor</div>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-3">Strategic Dimension</th>
                  <th className="py-2 px-3">Current Path (Traditional 60/40)</th>
                  <th className="py-2 px-3">Integrated GFI Plan</th>
                  <th className="py-2 px-3 text-right">Net Client Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Lifetime Federal & State Taxes (to Age 95)</td>
                  <td className="py-2 px-3">${taxAnalysis.totalBaselineTax.toLocaleString()}</td>
                  <td className="py-2 px-3 font-bold text-emerald-800">${taxAnalysis.totalPlanTax.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-black text-emerald-700">+${taxAnalysis.lifetimeTaxSaved.toLocaleString()} Saved</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Net Effective Conversion Tax Rate</td>
                  <td className="py-2 px-3">{taxAnalysis.grossStatutoryRatePct}% (Progressive)</td>
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
                  <td className="py-2.5 px-3">${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-900">$0 Tax-Free Inherited Base</td>
                  <td className="py-2.5 px-3 text-right font-black text-indigo-700">+${taxAnalysis.heirSavings.toLocaleString()} Sheltered</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Retirement Cash Flow Guarantee</td>
                  <td className="py-2.5 px-3">${traditional4PctIncome.toLocaleString()}/yr</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">${guaranteedFiaIncome.toLocaleString()}/yr</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">+${annualIncomeAdvantage.toLocaleString()}/yr Floor</td>
                </tr>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-900">
                  <td className="py-2.5 px-3 uppercase tracking-wider text-slate-900">Comprehensive Family Advantage</td>
                  <td className="py-2.5 px-3">--</td>
                  <td className="py-2.5 px-3">--</td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                    +${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5 page-break-before">
          <div className="border-b border-slate-300 pb-2 flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Visual Stress Testing & Wealth Projections</h2>
            <span className="text-[10px] text-slate-500 font-semibold">{clientName} • Strategic Client Dossier</span>
          </div>

          <div className="grid grid-cols-2 gap-4 avoid-break">
            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Lifetime Tax Burden: Inaction vs. Plan</h3>
              <div className="flex justify-center">
                <BarChart width={380} height={210} data={taxAnalysis.yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="age" stroke="#64748b" tick={{ fontSize: 9, fill: '#1e293b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#1e293b' }} tickFormatter={formatCurrencyAxis} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="baselineTax" name="Taxes Under Inaction" fill="#dc2626" isAnimationActive={false} />
                  <Bar dataKey="planTax" name="Taxes Under Plan" fill="#16a34a" isAnimationActive={false} />
                </BarChart>
              </div>
            </div>

            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Paychecks vs. 60/40 Market Volatility</h3>
              <div className="flex justify-center">
                <BarChart width={380} height={210} data={feeAdjustedBacktestResults} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="calendarYear" stroke="#64748b" tick={{ fontSize: 9, fill: '#1e293b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#1e293b' }} tickFormatter={formatCurrencyAxis} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="traditional6040Paycheck" name="4% Rule (Bear Drawdowns)" fill="#dc2626" isAnimationActive={false} />
                  <Bar dataKey="guaranteedFiaPaycheck" name="Contractual Paycheck Floor" fill="#16a34a" isAnimationActive={false} />
                </BarChart>
              </div>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden avoid-break">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Tactical Roth Conversion Schedule ($0 Pre-Tax Target)</span>
              <span className="text-[10px] text-slate-600">{(carrierBonusPct * 100).toFixed(0)}% Carrier Bonus Offset Applied</span>
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-1.5 px-2.5">Age</th>
                  <th className="py-1.5 px-2.5">Conversion</th>
                  <th className="py-1.5 px-2.5">Free Allowance</th>
                  <th className="py-1.5 px-2.5">Taxes Paid</th>
                  <th className="py-1.5 px-2.5">Gross Rate</th>
                  <th className="py-1.5 px-2.5 text-emerald-800">Net Rate</th>
                  <th className="py-1.5 px-2.5">Tax-Free Roth Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {taxAnalysis.yearlyData.filter(d => d.conversionAmount > 0).slice(0, 8).map(d => (
                  <tr key={d.age}>
                    <td className="py-1 px-2.5 font-bold">Age {d.age} {d.isWorking ? '(Working)' : '(Retired)'}</td>
                    <td className="py-1 px-2.5 font-semibold text-emerald-800">${d.conversionAmount.toLocaleString()}</td>
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

          <div className="border border-slate-300 p-3.5 rounded-lg bg-slate-50 space-y-3 avoid-break">
            <div className="text-[10px] text-slate-600 leading-relaxed space-y-1">
              <p><b>Important Professional & Legal Disclosures:</b> This presentation is prepared strictly for educational and comparative illustration purposes. Global Financial Impact and its appointed agents are not CPAs, tax attorneys, or registered investment advisors. Tax codes, sunset provisions, and statutory exemptions are subject to state and federal legislative change.</p>
              <p>Fixed Indexed Annuities (FIAs) and GLWB income riders are long-term insurance contracts subject to surrender charges, carrier solvency, index participation limits, and contract rules. AUM fee: {(aumFeePct * 100).toFixed(2)}%, FIA rider fee: {(annuityFeePct * 100).toFixed(2)}% ({feeDuration === 'ten_years' ? 'First 10 Yrs' : 'Life of Contract'}). Past benchmark performance does not guarantee future results.</p>
            </div>

            <div className="pt-3 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-800">
              <div className="space-y-5">
                <div>Client Signature: _________________________________________</div>
                <div>Date: ________________________</div>
              </div>
              <div className="space-y-5">
                <div>Licensed Advisor Signature: _______________________________</div>
                <div>License / National Producer #: _____________________________</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN-ONLY INTERACTIVE PLATFORM
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
            {/* Advisor Notes Toggle Button */}
            <button
              onClick={() => setShowAdvisorNotes(!showAdvisorNotes)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                showAdvisorNotes 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Advisor Dialogue Boxes ('Food for Thought') across all sections"
            >
              {showAdvisorNotes ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>Food for Thought: {showAdvisorNotes ? 'ON' : 'OFF'}</span>
            </button>

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

        {/* Top 4 Stat Banners */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <DollarSign className="w-4 h-4" /> TOTAL FAMILY WEALTH PRESERVED
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Kept in family pocket vs. IRS</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-rose-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <TrendingDown className="w-4 h-4" /> TAX UNDER INACTION
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${taxAnalysis.totalBaselineTax.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Taxes across retirement through age 95</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-cyan-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <Percent className="w-4 h-4" /> NET CONVERSION TAX RATE
            </div>
            <div className="text-3xl font-black tracking-tight text-cyan-300">
              {taxAnalysis.overallNetEffectiveTaxRate}%
              <span className="text-sm text-slate-400 font-normal line-through ml-2.5">
                {taxAnalysis.grossStatutoryRatePct}%
              </span>
            </div>
            <div className="text-xs text-emerald-400 mt-1 font-semibold">
              {(carrierBonusPct * 100).toFixed(0)}% Carrier Bonus offsets tax friction in {selectedState}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-indigo-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <Users className="w-4 h-4" /> HEIRS 10-YR TAX SHIELD
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${taxAnalysis.heirSavings.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">SECURE 2.0 penalty neutralized</div>
          </div>
        </div>

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

            {/* DUAL SCENARIO QUICK-TOGGLE BAR: TAXES & SEQUENCE RISK */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaxHikeActive(!taxHikeActive)}
                className={`py-2 px-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between shadow-sm ${
                  taxHikeActive
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold truncate">
                  <Flame className={`w-3.5 h-3.5 shrink-0 ${taxHikeActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>+4% Tax Hike</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                  taxHikeActive ? 'bg-rose-950 border-rose-700 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  {taxHikeActive ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setApplySequenceShock(!applySequenceShock)}
                className={`py-2 px-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between shadow-sm ${
                  applySequenceShock
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold truncate">
                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${applySequenceShock ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>Crash Shock</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                  applySequenceShock ? 'bg-amber-950 border-amber-700 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  {applySequenceShock ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

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
                Fees/Carrier
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

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span>Social Security (Combined):</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={socialSecurity}
                        onChange={(e) => setSocialSecurity(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white font-black text-right text-sm"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="80000"
                    step="1000"
                    value={socialSecurity}
                    onChange={(e) => setSocialSecurity(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span>Pension / Other Annuities:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={fixedIncome}
                        onChange={(e) => setFixedIncome(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white font-black text-right text-sm"
                      />
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80000"
                    step="2000"
                    value={fixedIncome}
                    onChange={(e) => setFixedIncome(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
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

                <div>
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span>Heirs Marginal Tax Bracket:</span>
                    <span className="font-black text-slate-200 text-sm">{(heirsTaxRate * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.12"
                    max="0.37"
                    step="0.02"
                    value={heirsTaxRate}
                    onChange={(e) => setHeirsTaxRate(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* SECTION 4: FEES, CARRIER, CAP RATE & DURATION */}
            {openSection === 'carrier' && (
              <div className="space-y-4 pt-1">
                {/* DUAL-STRATEGY FIA ALLOCATION SLIDER */}
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

                {/* S&P 500 CAP RATE ADJUSTER */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span className="font-semibold text-cyan-300">S&P 500 Annual Cap Rate:</span>
                    <span className="font-black text-cyan-400 text-sm">{(fiaCap * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.06"
                    max="0.14"
                    step="0.005"
                    value={fiaCap}
                    onChange={(e) => setFiaCap(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <span className="text-[11px] text-slate-400 block">Maximum crediting rate per contract year (backed by 0% legal floor).</span>
                </div>

                {/* ADVISORY AUM MANAGEMENT FEE SLIDER */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span className="font-semibold text-rose-300">Traditional Advisory AUM Fee:</span>
                    <span className="font-black text-rose-400 text-sm">{(aumFeePct * 100).toFixed(2)}% / yr</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.025"
                    step="0.0005"
                    value={aumFeePct}
                    onChange={(e) => setAumFeePct(Number(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  <span className="text-[11px] text-slate-400 block">Annual management fee deducted from traditional 60/40 &amp; equity accounts.</span>
                </div>

                {/* ANNUITY CONTRACT / RIDER FEE & DURATION CONTROLS */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex justify-between items-center text-slate-200 text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-400" /> Annuity Contract / Rider Fee:
                    </span>
                    <span className="font-black text-amber-400 text-sm">{(annuityFeePct * 100).toFixed(2)}% / yr</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.025"
                    step="0.0005"
                    value={annuityFeePct}
                    onChange={(e) => setAnnuityFeePct(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                  
                  {/* Fee Duration Option: First 10 Years vs Life of Annuity */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-300 font-bold block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Annuity Fee Duration:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setFeeDuration('ten_years')}
                        className={`py-1.5 px-2 rounded font-bold text-center transition ${
                          feeDuration === 'ten_years'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        First 10 Yrs Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeDuration('life')}
                        className={`py-1.5 px-2 rounded font-bold text-center transition ${
                          feeDuration === 'life'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Life of Annuity
                      </button>
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

                {/* STRESS BACKTEST MARKET OPTIONS SELECTOR */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="text-slate-200 block mb-1 text-xs font-semibold flex items-center justify-between">
                    <span>Historical Market Stress Cycle:</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {backtestPeriod === '2000_2010' && 'Dot-Com & 2008 Crash'}
                      {backtestPeriod === '2008_2018' && 'Great Recession & Recovery'}
                      {backtestPeriod === '2015_2025' && 'Tech Boom & Modern Shocks'}
                      {backtestPeriod === 'all_25_years' && '25-Year Cycle (2000–2024)'}
                    </span>
                  </label>
                  <select
                    value={backtestPeriod}
                    onChange={(e) => setBacktestPeriod(e.target.value as BacktestPeriod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="2000_2010">2000–2010 (Dot-Com Crash + 2008 Crash — The "Lost Decade")</option>
                    <option value="2008_2018">2008–2018 (Great Financial Crisis &amp; Historic Bull Recovery)</option>
                    <option value="2015_2025">2015–2024 (Modern Volatility, Rapid Rate Hikes &amp; Tech Rally)</option>
                    <option value="all_25_years">Full 25-Year Cycle (2000–2024 Historical Sequence)</option>
                  </select>
                </div>
              </div>
            )}

          </div>

          {/* Right Presentation Dashboard */}
          <div className="lg:col-span-8 space-y-6">

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

                {/* ACT 1: THE TRAP */}
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

                    <div>
                      <div className="text-sm font-bold text-slate-200 mb-2.5">
                        Annual Tax Burden Under Inaction (Reflects salary, retirement spending, and age 73 RMDs):
                      </div>
                      <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height={280} minWidth={0}>
                          <BarChart data={taxAnalysis.yearlyData}>
                            <XAxis dataKey="age" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                            <Bar dataKey="baselineTax" name="Forced Tax Liability Under Inaction" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <button onClick={() => setStoryStep(2)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                      Step 2: See How We Dismantle This With Roth Conversions <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* FOOD FOR THOUGHT CARD (ACT 1) */}
                    {showAdvisorNotes && (
                      <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                          <MessageSquare className="w-5 h-5" /> Food for Thought — Act 1: The Trap
                        </div>
                        <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                          <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                            <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                              {lang === 'es'
                                ? `"${firstName}, ¿qué sucedería si sus retiros de jubilación a partir de los ${retirementAge} años lo empujan a un tramo impositivo más alto de lo planeado, seguido por las RMD obligatorias a los 73 años? ¿Cómo impactaría esto su estilo de vida?"`
                                : `"${firstName}, what would happen if your retirement withdrawals starting at age ${retirementAge} push you into a higher tax bracket than expected, followed by compulsory RMDs at 73—how would that affect your lifestyle?"`
                              }
                            </div>
                            <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                              <span className="text-amber-400 font-bold mr-1.5">•</span>
                              {lang === 'es'
                                ? `"Los jubilados no le temen tanto a las caídas del mercado como a perder el control sobre sus ingresos. Las RMD le otorgan al IRS el control total de su factura fiscal."`
                                : `"Retirees don't fear market crashes as much as they fear losing control over their income. RMDs give the IRS total control over your tax bill."`
                              }
                            </div>
                          </div>

                          <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                            <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                              {lang === 'es'
                                ? `"${firstName}, si esto no se soluciona antes de que cambien las leyes tributarias, ¿qué cantidad de estos $${taxAnalysis.totalBaselineTax.toLocaleString()} se sentiría cómodo entregando al gobierno en lugar de dejárselo a su familia?"`
                                : `"${firstName}, if this isn't addressed now before tax laws shift, how much of this $${taxAnalysis.totalBaselineTax.toLocaleString()} do you feel comfortable handing over to the government instead of leaving it to your family?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Acumular saldos antes de impuestos sin una planificación proactiva convierte al IRS en su socio mayoritario."`
                              : `"Compounding pre-tax balances without proactive distribution planning turns the IRS into your majority wealth partner."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACT 2: THE SOLUTION */}
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

                  {/* VISUAL FOR ACT 2: WEALTH CONVERSION PROGRESSION */}
                  <div>
                    <div className="text-sm font-bold text-slate-200 mb-2.5">
                      Tactical Wealth Transformation (Pre-Tax IRA Shrinks to $0 while Tax-Free Roth Compounds):
                    </div>
                    <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <LineChart data={taxAnalysis.yearlyData}>
                          <XAxis dataKey="age" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Line type="monotone" dataKey="planIra" name="Pre-Tax IRA Balance (Target: $0)" stroke="#f43f5e" strokeWidth={3} strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="planRoth" name="Tax-Free Roth Balance (Zero RMDs)" stroke="#10b981" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <button onClick={() => setStoryStep(3)} className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                    Step 3: Secure Your Guaranteed Paychecks &amp; Playchecks <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* FOOD FOR THOUGHT CARD (ACT 2) */}
                  {showAdvisorNotes && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                        <MessageSquare className="w-5 h-5" /> Food for Thought — Act 2: The Solution
                      </div>
                      <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, si existiera una forma de aprovechar las tasas tributarias actuales para proteger permanentemente $${taxAnalysis.lifetimeTaxSaved.toLocaleString()} de impuestos futuros, ¿le daría eso mayor tranquilidad?"`
                              : `"${firstName}, if there was a way to take advantage of today's lower tax rates and permanently protect $${taxAnalysis.lifetimeTaxSaved.toLocaleString()} from compulsory IRS taxes, would that give you greater confidence?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"El mayor regalo que puede dejarle a su familia es una jubilación y un legado 100% libres de impuestos. Los impuestos están con descuento hoy; no lo estarán mañana."`
                              : `"The single greatest gift you can give your family is a 100% tax-free retirement and legacy. Taxes are on sale today; they won't be tomorrow."`
                            }
                          </div>
                        </div>

                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, sabiendo que bajo la ley SECURE sus hijos deben liquidar una cuenta heredada en 10 años, ¿qué tan importante es garantizar que reciban este patrimonio completamente libre de impuestos?"`
                              : `"${firstName}, knowing that under the SECURE Act your children have to liquidate an inherited IRA within 10 years, how important is it to make sure they inherit this 100% tax-free?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Sus hijos se verán obligados a liquidar su IRA tradicional en sus años de mayores ingresos a menos que lo convirtamos proactivamente ahora."`
                              : `"Your kids will be forced to take your pre-tax IRA distributions in their highest-earning career years unless we convert it now."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACT 3: PAYCHECKS & PLAYCHECKS */}
              {storyStep === 3 && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                        <Compass className="w-5 h-5 text-emerald-400" /> Paychecks &amp; Playchecks Framework
                      </div>
                      <span className="text-xs bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full font-mono font-bold">
                        MATH &amp; SCIENCE DRIVEN
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-5 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-2">
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wide">Bucket 1: Guaranteed Paychecks (Life Essentials)</div>
                        <div className="text-3xl font-black text-white">${guaranteedFiaIncome.toLocaleString()} / Year</div>
                        <div className="text-xs text-slate-300">Funded by: <b className="text-white">${customFiaDeposit.toLocaleString()}</b> FIA Contract</div>
                        <ul className="text-xs text-slate-200 space-y-2 pt-2">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Contractually guaranteed for life via Income FIA</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Completely neutralizes Sequence-of-Returns Risk</li>
                        </ul>
                      </div>

                      <div className="p-5 bg-sky-950/20 border border-sky-500/40 rounded-xl space-y-2">
                        <div className="text-xs font-black text-sky-400 uppercase tracking-wide">Bucket 2: Playchecks &amp; Growth (Freedom &amp; Family)</div>
                        <div className="text-3xl font-black text-white">${playcheckEquitiesRemaining.toLocaleString()} Invested</div>
                        <div className="text-xs text-slate-300">100% Unencumbered Equities (Growth Engine)</div>
                        <ul className="text-xs text-slate-200 space-y-2 pt-2">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-400 shrink-0" /> Invested for upside without crash liquidation pressure</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-sky-400 shrink-0" /> Funds lifestyle, travel, and family inheritance</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* VISUAL FOR ACT 3: PAYCHECK STABILITY VS 60/40 FLUCTUATION */}
                  <div>
                    <div className="text-sm font-bold text-slate-200 mb-2">
                      Guaranteed Life Paycheck Floor vs. Fluctuating 60/40 Portfolio Cash Flow:
                    </div>
                    <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <BarChart data={feeAdjustedBacktestResults}>
                          <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Bar dataKey="traditional6040Paycheck" name="Traditional 4% Paycheck (Drops in Bear Markets)" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="guaranteedFiaPaycheck" name="Guaranteed Life Paycheck (Contractual Floor)" fill="#10b981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <button onClick={() => setActiveTab('summary')} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm">
                    View Executive Takeaway Proposal <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* FOOD FOR THOUGHT CARD (ACT 3) */}
                  {showAdvisorNotes && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                        <MessageSquare className="w-5 h-5" /> Food for Thought — Act 3: Paychecks &amp; Playchecks
                      </div>
                      <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, si podemos garantizar que reciba $${guaranteedFiaIncome.toLocaleString()} cada año de por vida—incluso si el mercado cae 30%—¿con cuánta mayor tranquilidad dejaría el resto de su dinero invertido para crecer?"`
                              : `"${firstName}, if we can guarantee $${guaranteedFiaIncome.toLocaleString()} hits your bank account every single year for life—even if the market drops 30%—how much easier would it be to leave the rest of your portfolio invested for long-term growth?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Las anualidades no son buenas ni malas; cumplen una función matemática única: fabricar créditos de mortalidad garantizados. No ponemos todo su dinero en una anualidad; solo lo suficiente para cubrir sus costos de vida básicos de por vida."`
                              : `"Annuities aren't good or bad; they do a mathematical job no stock, bond, or fund can do: manufacture guaranteed mortality credits. You don't put all your money in an annuity; you only put enough to cover basic living costs for life."`
                            }
                          </div>
                        </div>

                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, con un portafolio tradicional 60/40, cuando el mercado cae como en 2008, retirar $32,000 lo obliga a vender acciones en pérdida. ¿Prefiere basar su sustento diario en la volatilidad de la bolsa o en una garantía legal contractual?"`
                              : `"${firstName}, with a traditional 60/40 portfolio, when the market crashes like in 2008, withdrawing $32,000 forces you to sell stocks at rock bottom. Do you want your grocery and healthcare money dependent on market timing, or backed by a legal contract?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Si fallece temprano, sus herederos reciben el saldo restante. Pero los planes de retiro no se diseñan para morir joven, sino para la verdadera catástrofe financiera: vivir hasta los 95 años y quedarse sin dinero."`
                              : `"If you die early, your heirs receive the remaining balance. But retirement plans aren't designed for dying young—they are built for the catastrophe of living to 95 and running out of money."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <button
                    onClick={() => setBacktestMode('equity_vs_fia')}
                    className={`px-3 py-1.5 rounded font-bold transition ${
                      backtestMode === 'equity_vs_fia' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Equities vs. FIA
                  </button>
                  <button
                    onClick={() => setBacktestMode('fixed_vs_fia')}
                    className={`px-3 py-1.5 rounded font-bold transition ${
                      backtestMode === 'fixed_vs_fia' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Fixed Annuity vs. FIA
                  </button>
                </div>
              </div>

              {/* MODE 1: BOND REPLACEMENT STRATEGY */}
              {backtestMode === 'stocks_fia_vs_6040' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 gap-3">
                    <div>
                      <span className="text-sm font-bold text-white block">Compare FIA Split Against Market Bonds:</span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        FIA Blend: {(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P 500 ({(fiaCap * 100).toFixed(1)}% Cap) + {((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed ({(fiaFixedYieldRate * 100).toFixed(1)}%)
                      </span>
                    </div>
                    {/* BOND CATEGORY SELECTOR */}
                    <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1 gap-1 text-xs">
                      <button
                        onClick={() => setSelectedBondType('corporate_ig')}
                        className={`px-3 py-1.5 rounded font-bold transition ${
                          selectedBondType === 'corporate_ig' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Corporate Bonds (IG)
                      </button>
                      <button
                        onClick={() => setSelectedBondType('high_yield')}
                        className={`px-3 py-1.5 rounded font-bold transition ${
                          selectedBondType === 'high_yield' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Aggressive / Junk Bonds (HY)
                      </button>
                      <button
                        onClick={() => setSelectedBondType('aggregate')}
                        className={`px-3 py-1.5 rounded font-bold transition ${
                          selectedBondType === 'aggregate' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        US Aggregate
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-xl space-y-1">
                      <span className="text-xs text-indigo-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Ending Capital
                      </span>
                      <div className="text-2xl font-black text-white">${finalModern6040.toLocaleString()}</div>
                      <p className="text-xs text-emerald-300 font-medium">
                        +${(finalModern6040 - finalTrad6040).toLocaleString()} net wealth advantage
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-rose-500/40 rounded-xl space-y-1">
                      <span className="text-xs text-rose-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4" /> Max Drawdown
                      </span>
                      <div className="text-2xl font-black text-emerald-400">
                        -{backtest.maxDrawdownModernFiaPct}% <span className="text-sm font-normal text-slate-400">vs -{backtest.maxDrawdownTrad6040Pct}% (Bonds)</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Peak-to-trough loss cushioned by 0% legal floor
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-1">
                      <span className="text-xs text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Guaranteed Floor
                      </span>
                      <div className="text-2xl font-black text-emerald-400">+{effectiveGuaranteedFloorPct.toFixed(2)}% / yr</div>
                      <p className="text-xs text-slate-300">
                        {((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% fixed sleeve ensures positive interest in all crash years
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-200 mb-2">
                      Portfolio Wealth Progression ($1.25M with ${withdrawalNeed.toLocaleString()}/yr Living Withdrawals):
                    </div>
                    <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <LineChart data={feeAdjustedBacktestResults}>
                          <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Line type="monotone" dataKey="traditional6040Balance" name={`Traditional 60/40 (Stocks + ${selectedBondType === 'corporate_ig' ? 'Corporate' : selectedBondType === 'high_yield' ? 'Aggressive' : 'Agg'} Bonds - ${(aumFeePct * 100).toFixed(2)}% AUM)`} stroke="#f43f5e" strokeWidth={3} />
                          <Line type="monotone" dataKey="modernized6040FiaBalance" name={`Modernized 60/40 (Stocks + FIA net of fees)`} stroke="#10b981" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* FOOD FOR THOUGHT CARD (BOND REPLACEMENT) */}
                  {showAdvisorNotes && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                        <MessageSquare className="w-5 h-5" /> Food for Thought — The Decumulation Defense
                      </div>
                      <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, el mayor peligro en la jubilación no es que las acciones caigan; es verse forzado a liquidar bonos o acciones a la baja para cubrir sus $${withdrawalNeed.toLocaleString()} anuales. Al mover su porción conservadora a una FIA con piso del 0% y tasa fija positiva de +${effectiveGuaranteedFloorPct.toFixed(2)}%, sus cheques de vida provienen de un bolsillo protegido, dando a sus acciones el tiempo necesario para rebotar sin pérdidas forzadas. ¿Tiene sentido eliminar el riesgo de liquidación en su plan?"`
                              : `"${firstName}, the single greatest threat in retirement is not that equities drop—it's being forced to sell bonds or stocks at a loss to fund your $${withdrawalNeed.toLocaleString()} in annual living expenses. By shifting your conservative 40% into an FIA with a contractual floor and a +${effectiveGuaranteedFloorPct.toFixed(2)}% guaranteed baseline, your living paychecks are drawn from an insulated bucket, giving your equities the runway they need to recover. Does it make sense to remove liquidation risk from your plan?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Los bonos agresivos tienen una alta correlación con la bolsa de valores; cuando las acciones caen, los bonos chatarra se desploman. Una FIA ofrece una verdadera descorrelación con piso del 0% garantizado."`
                              : `"High-yield aggressive bonds are heavily correlated with equities; when stocks crash, junk bonds plunge too. An FIA provides true non-correlated defense with a legal 0% floor."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: PAYCHECKS (FIA) VS 60/40 */}
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

                  <div>
                    <div className="text-sm font-bold text-slate-200 mb-2">
                      Annual Cash Flow: Guaranteed Paychecks vs. Fluctuating 60/40 Market Risk:
                    </div>
                    <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                      <ResponsiveContainer width="100%" height={280} minWidth={0}>
                        <BarChart data={feeAdjustedBacktestResults}>
                          <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Bar dataKey="traditional6040Paycheck" name="Traditional 4% Paycheck (Drops in Bear Markets)" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="guaranteedFiaPaycheck" name="Guaranteed Life Paycheck (Contractual Floor)" fill="#10b981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* FOOD FOR THOUGHT CARD (PAYCHECKS VS 60/40) */}
                  {showAdvisorNotes && (
                    <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                        <MessageSquare className="w-5 h-5" /> Food for Thought — Paychecks vs. 60/40 Portfolio
                      </div>
                      <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, con un portafolio tradicional 60/40, cuando el mercado cayó en 2008, un retiro del 4% se redujo drásticamente o forzó a los inversionistas a liquidar acciones con una pérdida del 37%. Con una FIA de ingreso, sus $${guaranteedFiaIncome.toLocaleString()} anuales están respaldados legalmente por contrato de por vida. ¿Prefiere que sus gastos esenciales dependan del humor de Wall Street o de una garantía legal?"`
                              : `"${firstName}, with a traditional 60/40 portfolio, when the market crashed in 2008, taking a standard 4% withdrawal either forced retirees to take a massive pay cut or liquidate equities down 37%. With an Income FIA, your $${guaranteedFiaIncome.toLocaleString()} annual paycheck is legally guaranteed for life. Do you want your grocery and healthcare money dependent on market timing, or backed by a legal contract?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Eficiencia de Capital: En lugar de inmovilizar $${capitalNeededUnder4Pct.toLocaleString()} en bonos y acciones conservadoras para generar $${guaranteedFiaIncome.toLocaleString()}, la FIA lo logra con solo $${customFiaDeposit.toLocaleString()}, liberando $${liberatedCapitalForGrowth.toLocaleString()} para que continúen invertidos agresivamente para crecimiento familiar."`
                              : `"Capital Efficiency: Instead of tying up $${capitalNeededUnder4Pct.toLocaleString()} under traditional safe withdrawal rules to produce $${guaranteedFiaIncome.toLocaleString()}, the FIA accomplishes the same income with only $${customFiaDeposit.toLocaleString()}, liberating $${liberatedCapitalForGrowth.toLocaleString()} to remain 100% invested in equities for family legacy and inflation protection."`
                            }
                          </div>
                        </div>

                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, si sus necesidades esenciales ya están 100% cubiertas por estos cheques garantizados, ¿con cuánta mayor tranquilidad dejaría el resto de sus $${playcheckEquitiesRemaining.toLocaleString()} invertidos en la bolsa para crecer a largo plazo sin miedo a las caídas?"`
                              : `"${firstName}, knowing your baseline lifestyle is 100% defended by guaranteed lifetime paychecks, how much easier will it be to leave your remaining $${playcheckEquitiesRemaining.toLocaleString()} invested in equities for long-term growth without panic-selling during a crash?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"Dividir el patrimonio entre 'Paychecks' (garantizados para lo esencial) y 'Playchecks' (renta variable para crecimiento y diversión) elimina por completo el pánico financiero en la jubilación."`
                              : `"Separating wealth into 'Paychecks' (contractual certainty for essentials) and 'Playchecks' (unencumbered equities for fun, travel, and legacy) permanently cures financial anxiety in retirement."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: EQUITIES VS FIA ACCUMULATION */}
              {backtestMode === 'equity_vs_fia' && (
                <div className="space-y-4">
                  <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={280} minWidth={0}>
                      <LineChart data={feeAdjustedBacktestResults}>
                        <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                        <Line type="monotone" dataKey="equityBalance" name={`S&P 500 Equities (-${(aumFeePct * 100).toFixed(2)}% AUM Fee)`} stroke="#f43f5e" strokeWidth={3} />
                        <Line type="monotone" dataKey="fiaBalance" name={`FIA (Net of ${(annuityFeePct * 100).toFixed(2)}% Rider Fee)`} stroke="#06b6d4" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-300 font-bold uppercase">Ending Accumulated Balance</span>
                      <div className="text-2xl font-black text-cyan-400 mt-1">${finalFiaOnly.toLocaleString()}</div>
                      <p className="text-xs text-slate-400 mt-0.5">vs. ${finalEquityOnly.toLocaleString()} in market equities</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-300 font-bold uppercase">Contractual Floor Defense</span>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{backtest.zeroLossYearsCount} Down Years Defended</div>
                      <p className="text-xs text-slate-400 mt-0.5">Guaranteed minimum positive floor: +{effectiveGuaranteedFloorPct.toFixed(2)}% / yr</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 4: FIXED ANNUITY VS FIA */}
              {backtestMode === 'fixed_vs_fia' && (
                <div className="space-y-4">
                  <div className="w-full bg-slate-950/40 p-2 rounded-xl border border-slate-800" style={{ height: 300, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={280} minWidth={0}>
                      <LineChart data={feeAdjustedBacktestResults}>
                        <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={formatCurrencyAxis} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                        <Line type="monotone" dataKey="fixedAnnuityBalance" name={`Fixed Annuity / CD (${(fixedRate * 100).toFixed(2)}% Net of Tax)`} stroke="#94a3b8" strokeWidth={3} />
                        <Line type="monotone" dataKey="fiaBalance" name={`FIA (Net of ${(annuityFeePct * 100).toFixed(2)}% Rider Fee)`} stroke="#06b6d4" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-300 font-bold uppercase">Ending Accumulated Balance</span>
                      <div className="text-2xl font-black text-cyan-400 mt-1">${finalFiaOnly.toLocaleString()}</div>
                      <p className="text-xs text-slate-400 mt-0.5">vs. ${backtest.finalFixed.toLocaleString()} in taxable fixed CDs</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-300 font-bold uppercase">Contractual Floor Defense</span>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{backtest.zeroLossYearsCount} Down Years Defended</div>
                      <p className="text-xs text-slate-400 mt-0.5">Principal preserved in crash cycles</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: ROTH BLUEPRINT */}
          {activeTab === 'roth' && (
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-black text-white text-xl tracking-tight">
                    Roth Blueprint with Full Conversion Runway
                  </h3>
                  <p className="text-sm text-slate-300 mt-0.5">
                    State: <b className="text-cyan-300 font-bold">{STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</b> • Schedule: <b className="text-emerald-300 font-bold">{freeWithdrawalSchedule === 'tiered_2_12' ? '2% Yr 1 → 12% Yrs 2–10 → 100% Yr 11+' : freeWithdrawalSchedule === 'standard_10' ? '0% Yr 1 → 10% Yrs 2–10 → 100% Yr 11+' : '10% Flat Annual'}</b>
                  </p>
                </div>
                <span className="text-sm font-black text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-4 py-1.5 rounded-full shadow-sm">
                  Total Lifetime Savings: ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-1">
                  <span className="text-xs text-cyan-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <Gift className="w-4 h-4" /> Carrier Bonus
                  </span>
                  <div className="text-2xl font-black text-white">+${taxAnalysis.upfrontBonusDollars.toLocaleString()}</div>
                  <p className="text-xs text-slate-300">
                    {(carrierBonusPct * 100).toFixed(0)}% upfront carrier credit absorbs friction.
                  </p>
                </div>

                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-xs text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <Percent className="w-4 h-4" /> Effective Rate
                  </span>
                  <div className="text-2xl font-black text-slate-200">{taxAnalysis.grossStatutoryRatePct}%</div>
                  <p className="text-xs text-slate-300">
                    Progressive Fed + {selectedState} ({(stateTaxRate * 100).toFixed(1)}%) rate.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-emerald-950/50 via-cyan-950/50 to-slate-900 border border-emerald-500/60 rounded-xl space-y-1 shadow-sm">
                  <span className="text-xs text-emerald-300 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Net Rate
                  </span>
                  <div className="text-3xl font-black text-emerald-400">
                    {taxAnalysis.overallNetEffectiveTaxRate}%
                  </div>
                  <p className="text-xs text-emerald-200 font-semibold">
                    Out-of-pocket rate after bonus offset.
                  </p>
                </div>

                <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-1">
                  <span className="text-xs text-indigo-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Converted
                  </span>
                  <div className="text-2xl font-black text-white">${taxAnalysis.totalConversionsExecuted.toLocaleString()}</div>
                  <p className="text-xs text-slate-300">
                    Sheltered in permanent tax-free Roth status.
                  </p>
                </div>
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
                  <span className="text-xs text-cyan-300 font-semibold">
                    {(carrierBonusPct * 100).toFixed(0)}% Bonus Offset | {selectedState} ({(stateTaxRate * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-950 border-b-2 border-slate-800 text-slate-300 text-xs uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-2">Age (Status)</th>
                        <th className="py-3 px-2">Conversion Amount</th>
                        <th className="py-3 px-2">Free Withdrawal Limit</th>
                        <th className="py-3 px-2">Taxes Paid from Contract</th>
                        <th className="py-3 px-2">Gross Tax Rate</th>
                        <th className="py-3 px-2 text-emerald-400">Net Tax Rate</th>
                        <th className="py-3 px-2">Tax-Free Roth Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {taxAnalysis.yearlyData.filter(d => d.conversionAmount > 0).map(d => (
                        <tr key={d.age} className="hover:bg-slate-900/60 transition">
                          <td className="py-3 px-2 font-bold text-white whitespace-nowrap">
                            Age {d.age} {d.isWorking ? <span className="text-sky-400 text-xs font-semibold ml-1">(Working)</span> : <span className="text-emerald-400 text-xs font-semibold ml-1">(Retired)</span>}
                          </td>
                          <td className="py-3 px-2 text-emerald-400 font-bold whitespace-nowrap">${d.conversionAmount.toLocaleString()}</td>
                          <td className="py-3 px-2 text-slate-300 font-semibold whitespace-nowrap">
                            ${d.maxFreeWithdrawal.toLocaleString()}
                            <span className="text-xs text-cyan-300 ml-1.5 font-bold">
                              {d.isSurrenderExpired ? (
                                <span className="text-emerald-400 inline-flex items-center gap-0.5">
                                  <Unlock className="w-3.5 h-3.5 inline" /> 100% Free
                                </span>
                              ) : (
                                `(${d.maxFreeWithdrawalRatePct}%)`
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-rose-300 font-semibold whitespace-nowrap">${d.taxesPaidFromWithdrawal.toLocaleString()}</td>
                          <td className="py-3 px-2 text-slate-300 whitespace-nowrap">{d.statutoryRatePct}%</td>
                          <td className="py-3 px-2 text-cyan-300 font-black whitespace-nowrap">
                            {d.netEffectiveRatePct}%
                            <span className="text-xs text-emerald-400 ml-1.5 font-medium">(-{(carrierBonusPct * 100).toFixed(0)}% bonus)</span>
                          </td>
                          <td className="py-3 px-2 text-indigo-300 font-bold whitespace-nowrap">${d.planRoth.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-950/40 border-t-2 border-emerald-500/70 font-black text-sm">
                        <td className="py-3.5 px-2 text-emerald-300 uppercase tracking-wide">Total Runway Complete</td>
                        <td className="py-3.5 px-2 text-emerald-400">${taxAnalysis.totalConversionsExecuted.toLocaleString()}</td>
                        <td className="py-3.5 px-2 text-slate-400">--</td>
                        <td className="py-3.5 px-2 text-rose-300">${(taxAnalysis.totalConversionsExecuted * (taxAnalysis.overallNetEffectiveTaxRate / 100)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                        <td className="py-3.5 px-2 text-slate-300">{taxAnalysis.grossStatutoryRatePct}% Avg</td>
                        <td className="py-3.5 px-2 text-cyan-300">{taxAnalysis.overallNetEffectiveTaxRate}% Net</td>
                        <td className="py-3.5 px-2 text-emerald-300 text-base">100% Tax-Free Roth</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOD FOR THOUGHT CARD (ROTH BLUEPRINT) */}
              {showAdvisorNotes && (
                <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                    <MessageSquare className="w-5 h-5" /> Food for Thought — Tactical Roth Runway
                  </div>
                  <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                    <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                      <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                        {lang === 'es'
                          ? `"${firstName}, al modelar su salario actual de $${currentEarnedIncome.toLocaleString()} antes de la jubilación y su ingreso meta de $${withdrawalNeed.toLocaleString()} al jubilarse, calibramos exactamente cuánto espacio libre queda en el tramo impositivo elegido sin sobrepasar su límite marginal. Con el bono del ${(carrierBonusPct * 100).toFixed(0)}%, su tasa neta efectiva es solo del ${taxAnalysis.overallNetEffectiveTaxRate}%. ¿Tiene sentido ejecutar esta conversión estratégica?"`
                          : `"${firstName}, by incorporating your current salary of $${currentEarnedIncome.toLocaleString()} prior to retirement and your target income of $${withdrawalNeed.toLocaleString()} once retired, we identify the exact room remaining in your selected tax bracket without spilling over into higher rates. With the ${(carrierBonusPct * 100).toFixed(0)}% upfront carrier bonus, your net effective tax rate is just ${taxAnalysis.overallNetEffectiveTaxRate}%. Does it make sense to put this disciplined tax strategy into practice?"`
                        }
                      </div>
                      <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                        <span className="text-amber-400 font-bold mr-1.5">•</span>
                        {lang === 'es'
                          ? `"Pagar impuestos ahora no es un gasto; es comprar un dólar libre de impuestos por un descuento significativo. El bono de la aseguradora absorbe el costo para que sus herederos reciban el 100% libre de impuestos bajo la ley SECURE."`
                          : `"Paying taxes now isn't an expense; it's buying a future tax-free dollar at a major discount. The carrier's upfront bonus absorbs the friction so your children inherit 100% tax-free wealth under the SECURE Act."`
                        }
                      </div>
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
                      <td className="py-3.5 px-3 font-semibold text-white">State of Residence Tax Impact</td>
                      <td className="py-3.5 px-3">{STATE_TAX_RATES[selectedState]?.name}</td>
                      <td className="py-3.5 px-3 text-cyan-400 font-bold">{(stateTaxRate * 100).toFixed(1)}% Tax</td>
                      <td className="py-3.5 px-3 text-right text-cyan-400 font-bold">Calibrated</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-3 font-semibold text-white">Carrier Premium Bonus Offset</td>
                      <td className="py-3.5 px-3">$0 (None)</td>
                      <td className="py-3.5 px-3 text-cyan-400 font-bold">+${taxAnalysis.upfrontBonusDollars.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right text-cyan-400 font-bold">
                        {(carrierBonusPct * 100).toFixed(0)}% Bonus
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-3 font-semibold text-white">Net Effective Conversion Tax Rate</td>
                      <td className="py-3.5 px-3">{taxAnalysis.grossStatutoryRatePct}% (Progressive)</td>
                      <td className="py-3.5 px-3 text-emerald-400 font-bold">{taxAnalysis.overallNetEffectiveTaxRate}%</td>
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">
                        -{(carrierBonusPct * 100).toFixed(0)}% Net Discount
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-3 font-semibold text-white">Avoided Mandatory RMDs</td>
                      <td className="py-3.5 px-3">$0</td>
                      <td className="py-3.5 px-3 text-indigo-400 font-bold">${taxAnalysis.totalRmdAvoided.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right text-indigo-400 font-bold">Sheltered</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-3 font-semibold text-white">Heir SECURE Act 10-Yr Penalty</td>
                      <td className="py-3.5 px-3">${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-indigo-400 font-bold">$0 (Roth)</td>
                      <td className="py-3.5 px-3 text-right text-indigo-400 font-bold">+${taxAnalysis.heirSavings.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-3 font-semibold text-white">Guaranteed Annual Paycheck Floor</td>
                      <td className="py-3.5 px-3">${traditional4PctIncome.toLocaleString()}/yr</td>
                      <td className="py-3.5 px-3 text-emerald-400 font-bold">${guaranteedFiaIncome.toLocaleString()}/yr</td>
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">+${annualIncomeAdvantage.toLocaleString()}/yr Floor</td>
                    </tr>
                    <tr className="bg-indigo-950/50 font-black text-base border-t-2 border-indigo-500/70">
                      <td className="py-4 px-3 text-white">Total Comprehensive Wealth Advantage</td>
                      <td className="py-4 px-3">--</td>
                      <td className="py-4 px-3">--</td>
                      <td className="py-4 px-3 text-right text-emerald-400 text-lg">
                        +${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* FOOD FOR THOUGHT CARD (SUMMARY) */}
              {showAdvisorNotes && (
                <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                    <MessageSquare className="w-5 h-5" /> Food for Thought — Closing Recommendation
                  </div>
                  <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                    <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                      <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                        {lang === 'es'
                          ? `"${firstName}, cuando combinamos el ahorro impositivo de $${taxAnalysis.lifetimeTaxSaved.toLocaleString()}, la protección de $${taxAnalysis.heirSavings.toLocaleString()} para sus hijos y el cheque vitalicio garantizado de $${guaranteedFiaIncome.toLocaleString()}/año, su ventaja financiera integral neta supera los $${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}. Con estos números en la mano, ¿hay alguna razón por la que no debamos implementar esta estructura?"`
                          : `"${firstName}, when you combine the $${taxAnalysis.lifetimeTaxSaved.toLocaleString()} in avoided lifetime taxes, the $${taxAnalysis.heirSavings.toLocaleString()} protected for your children, and the guaranteed paycheck floor of $${guaranteedFiaIncome.toLocaleString()}/year, your total comprehensive wealth advantage exceeds $${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}. Based on these numbers, is there any reason we shouldn't put this blueprint into motion?"`
                        }
                      </div>
                      <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                        <span className="text-amber-400 font-bold mr-1.5">•</span>
                        {lang === 'es'
                          ? `"El costo de la inacción es de $${taxAnalysis.totalBaselineTax.toLocaleString()} pagados al IRS. Actuar ahora congela ese costo permanentemente."`
                          : `"The cost of inaction is $${taxAnalysis.totalBaselineTax.toLocaleString()} surrendered to the IRS. Taking action now locks in a permanent family discount."`
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Regulatory Disclosures */}
      <footer className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-400 leading-relaxed space-y-3 print:hidden">
        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-slate-300 text-xs">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>IMPORTANT REGULATORY &amp; LEGAL DISCLOSURES</span>
        </div>

        <p>
          <b>Not Tax, Accounting, or Legal Advice:</b> This software platform, presentation materials, and associated discussion points are designed strictly for educational, illustrative, and informational purposes. Neither the creators of this tool, Global Financial Impact (GFI), nor the presenting life insurance licensed agents are Certified Public Accountants (CPAs), licensed tax professionals, or attorneys. Federal, state, and local tax laws, brackets, deductions, and phase-out thresholds (including TCJA sunset assumptions and SECURE 2.0 legislation) are complex, subject to statutory change, and depend on individual financial circumstances. Clients must consult a qualified CPA, independent tax advisor, or estate planning attorney regarding their specific tax position before executing any Roth conversions, withdrawals, or asset reallocations.
        </p>

        <p>
          <b>Not Registered Investment Advisory or Securities Recommendations:</b> Nothing contained within this presentation or generated output constitutes an offer to buy, sell, or hold any security, mutual fund, ETF, or stock portfolio. The comparisons provided between equities, fixed income instruments, and Fixed Indexed Annuities (FIAs) are mathematical and hypothetical models based on historical benchmark performance (e.g., S&amp;P 500 Price Return index data) and do not represent the actual trading performance of any specific client portfolio or investment fund. Past performance is never a guarantee of future investment results.
        </p>

        <p>
          <b>Insurance and Annuity Contract Terms:</b> Fixed Indexed Annuities (FIAs) and Guaranteed Lifetime Withdrawal Benefit (GLWB) riders are long-term insurance contracts issued by third-party insurance carriers. All contractual guarantees—including annual index crediting floors (0% floor), income payout rates, and lifetime paychecks—are backed solely by the financial strength and claims-paying ability of the issuing insurance company. FIA contracts may be subject to surrender charges, market value adjustments (MVA), crediting rate caps, annual rider fees, and participation limits that vary by carrier and state of issue. Upfront premium bonuses and bonus credits may be subject to vesting schedules, recapture charges, or lower underlying crediting caps. Withdrawals prior to age 59½ may trigger a 10% IRS penalty in addition to ordinary income taxation.
        </p>

        <p className="text-xs text-slate-500">
          © 2026 Global Financial Impact (GFI). All rights reserved. Calculations are generated via mathematical simulation models and do not constitute a formal insurance illustration or prospectus. For official contract values, obtain a carrier-approved product illustration from a properly appointed, state-licensed insurance producer.
        </p>
      </footer>

    </div>
  </main>
);
}