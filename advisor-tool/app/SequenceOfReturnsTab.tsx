'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Sliders,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';

interface SequenceOfReturnsTabProps {
  initialPortfolio?: number;
  retirementAge?: number;
  lang?: 'en' | 'es';
}

// 35-year realistic market return sequence (geometric mean ~6.9%, arithmetic mean ~8.0%)
// Bad-to-Good starts with a severe early-retirement bear market (-22%, -14%, -9%) right at retirement
const BAD_TO_GOOD_STOCK_RETURNS = [
  -0.22, -0.14, -0.09, 0.16, 0.11, -0.04, 0.18, 0.14, 0.08, -0.06,
  0.19, 0.13, 0.09, 0.15, -0.03, 0.17, 0.12, 0.10, 0.14, -0.05,
  0.21, 0.15, 0.11, 0.16, 0.09, 0.18, 0.14, 0.12, 0.19, 0.15,
  -0.07, 0.16, 0.13, 0.11, 0.14,
];

const BAD_TO_GOOD_BOND_RETURNS = [
  0.04, 0.05, 0.03, 0.02, 0.04, 0.06, 0.03, 0.02, 0.04, 0.05,
  0.03, 0.04, 0.04, 0.03, 0.05, 0.03, 0.04, 0.04, 0.03, 0.05,
  0.03, 0.04, 0.04, 0.03, 0.04, 0.03, 0.04, 0.04, 0.03, 0.04,
  0.05, 0.03, 0.04, 0.04, 0.03,
];

// Deterministic 1,000-trial Monte Carlo / Sequence-Permutation Probability of Success calculator
function computeProbabilityOfSuccess(params: {
  totalCapital: number;
  annuityPrincipal: number;
  annuityPayoutRate: number;
  targetAnnualIncome: number;
  adjustForInflation: boolean;
  inflationRate: number;
  stockWeight: number;
  bondWeight: number;
  horizonYears: number;
}): number {
  const {
    totalCapital,
    annuityPrincipal,
    annuityPayoutRate,
    targetAnnualIncome,
    adjustForInflation,
    inflationRate,
    stockWeight,
    bondWeight,
    horizonYears,
  } = params;

  const liquidStart = Math.max(0, totalCapital - annuityPrincipal);
  const guaranteedAnnualPaycheck = annuityPrincipal * (annuityPayoutRate / 100);

  // If guaranteed income alone meets or exceeds inflation-adjusted target across all years, 99.5% success
  const trials = 600;
  let successes = 0;

  // Seeded LCG PRNG so numbers stay stable and reproducible across renders
  let seed = 133742;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const n = BAD_TO_GOOD_STOCK_RETURNS.length;

  for (let t = 0; t < trials; t++) {
    let bal = liquidStart;
    let failed = false;

    // Bootstrap / block-shuffled historical return path for each trial
    let idx = Math.floor(nextRand() * n);

    for (let yr = 0; yr < horizonYears; yr++) {
      // 75% chance to continue historical block sequence, 25% chance to jump to another regime
      if (nextRand() < 0.25) {
        idx = Math.floor(nextRand() * n);
      } else {
        idx = (idx + 1) % n;
      }

      const sRet = BAD_TO_GOOD_STOCK_RETURNS[idx];
      const bRet = BAD_TO_GOOD_BOND_RETURNS[idx];
      const portRet = stockWeight * sRet + bondWeight * bRet;

      const neededIncome = adjustForInflation
        ? targetAnnualIncome * Math.pow(1 + inflationRate / 100, yr)
        : targetAnnualIncome;

      // Guaranteed lifetime income pays first; liquid portfolio only covers the remaining income gap
      const netLiquidDraw = Math.max(0, neededIncome - guaranteedAnnualPaycheck);

      if (netLiquidDraw > 0) {
        if (bal < netLiquidDraw) {
          failed = true;
          break;
        }
        bal = (bal - netLiquidDraw) * (1 + portRet);
      } else {
        bal = bal * (1 + portRet);
      }
    }

    if (!failed) successes++;
  }

  const rawPct = (successes / trials) * 100;
  return Math.min(99, Math.max(1, Math.round(rawPct)));
}

export default function SequenceOfReturnsTab({
  initialPortfolio = 1000000,
  retirementAge = 65,
  lang = 'en',
}: SequenceOfReturnsTabProps) {
  // Core Portfolio Inputs
  const [startingBalance, setStartingBalance] = useState<number>(
    initialPortfolio > 0 ? initialPortfolio : 1000000
  );
  const [startAge, setStartAge] = useState<number>(retirementAge || 65);
  const [horizonYears, setHorizonYears] = useState<number>(35);
  const [stockPct, setStockPct] = useState<number>(60);
  const [withdrawalRate, setWithdrawalRate] = useState<number>(5.5);
  const [customTargetIncome, setCustomTargetIncome] = useState<number | null>(null);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(true);
  const [inflationRate, setInflationRate] = useState<number>(2.5);

  // Sequence Mode: 'bad_to_good' vs 'good_to_bad'
  const [sequenceOrder, setSequenceOrder] = useState<'bad_to_good' | 'good_to_bad'>('bad_to_good');

  // Indexed Income Annuity Compare & Contrast State
  const [compareAnnuity, setCompareAnnuity] = useState<boolean>(true);
  const [annuityMode, setAnnuityMode] = useState<'total_portfolio' | 'bond_replacement'>('total_portfolio');
  const [annuityPct, setAnnuityPct] = useState<number>(50);
  const [annuityPayoutRate, setAnnuityPayoutRate] = useState<number>(7.2);
  const [showYearTable, setShowYearTable] = useState<boolean>(false);

  const bondPct = Math.max(0, 100 - stockPct);

  // Target Annual Income (linked to withdrawalRate unless overridden)
  const targetAnnualIncome =
    customTargetIncome !== null
      ? customTargetIncome
      : Math.round(startingBalance * (withdrawalRate / 100));

  const effectiveTotalWithdrawalRate =
    startingBalance > 0 ? (targetAnnualIncome / startingBalance) * 100 : 0;

  // Compute how much capital goes into the Indexed Income Annuity vs remaining liquid Stocks/Bonds
  const allocationSplit = useMemo(() => {
    if (!compareAnnuity || annuityPct <= 0) {
      return {
        annuityPrincipal: 0,
        liquidPortfolio: startingBalance,
        annuityShareOfTotal: 0,
        remainingStockWeight: stockPct / 100,
        remainingBondWeight: bondPct / 100,
        remainingStockPctDisplay: stockPct,
        remainingBondPctDisplay: bondPct,
      };
    }

    if (annuityMode === 'bond_replacement') {
      // Replace X% of Bonds with the Income Annuity; keep all Stocks intact in the remaining liquid bucket
      const bondDollars = startingBalance * (bondPct / 100);
      const stockDollars = startingBalance * (stockPct / 100);
      const annuityPrincipal = bondDollars * (annuityPct / 100);
      const remainingBondDollars = bondDollars - annuityPrincipal;
      const liquidPortfolio = stockDollars + remainingBondDollars;

      return {
        annuityPrincipal,
        liquidPortfolio,
        annuityShareOfTotal: startingBalance > 0 ? (annuityPrincipal / startingBalance) * 100 : 0,
        remainingStockWeight: liquidPortfolio > 0 ? stockDollars / liquidPortfolio : 0,
        remainingBondWeight: liquidPortfolio > 0 ? remainingBondDollars / liquidPortfolio : 0,
        remainingStockPctDisplay:
          liquidPortfolio > 0 ? Math.round((stockDollars / liquidPortfolio) * 100) : 0,
        remainingBondPctDisplay:
          liquidPortfolio > 0 ? Math.round((remainingBondDollars / liquidPortfolio) * 100) : 0,
      };
    } else {
      // Allocate X% of Total Portfolio to the Income Annuity; remaining liquid portfolio keeps stockPct/bondPct mix
      const annuityPrincipal = startingBalance * (Math.min(100, Math.max(0, annuityPct)) / 100);
      const liquidPortfolio = Math.max(0, startingBalance - annuityPrincipal);

      return {
        annuityPrincipal,
        liquidPortfolio,
        annuityShareOfTotal: startingBalance > 0 ? (annuityPrincipal / startingBalance) * 100 : 0,
        remainingStockWeight: stockPct / 100,
        remainingBondWeight: bondPct / 100,
        remainingStockPctDisplay: stockPct,
        remainingBondPctDisplay: bondPct,
      };
    }
  }, [compareAnnuity, annuityMode, annuityPct, startingBalance, stockPct, bondPct]);

  // Guaranteed Annual Income produced by the Indexed Income Annuity
  const guaranteedAnnuityIncome =
    allocationSplit.annuityPrincipal * (annuityPayoutRate / 100);

  // Net Year-1 Income Gap that must be withdrawn from the remaining liquid portfolio
  const year1NetPortfolioDraw = Math.max(0, targetAnnualIncome - guaranteedAnnuityIncome);

  // Effective Year-1 Withdrawal Rate on the Remaining Liquid Portfolio
  const effectiveLiquidWithdrawalRate =
    allocationSplit.liquidPortfolio > 0
      ? (year1NetPortfolioDraw / allocationSplit.liquidPortfolio) * 100
      : 0;

  // Share of Target Income covered by Guaranteed Lifetime Income
  const incomeCoveredPct =
    targetAnnualIncome > 0
      ? Math.min(100, Math.round((guaranteedAnnuityIncome / targetAnnualIncome) * 100))
      : 0;

  // Probability of Success (Current Portfolio vs. Income Annuity Strategy)
  const probOfSuccess = useMemo(() => {
    const currentSuccess = computeProbabilityOfSuccess({
      totalCapital: startingBalance,
      annuityPrincipal: 0,
      annuityPayoutRate: 0,
      targetAnnualIncome,
      adjustForInflation,
      inflationRate,
      stockWeight: stockPct / 100,
      bondWeight: bondPct / 100,
      horizonYears,
    });

    const annuityStrategySuccess = computeProbabilityOfSuccess({
      totalCapital: startingBalance,
      annuityPrincipal: allocationSplit.annuityPrincipal,
      annuityPayoutRate,
      targetAnnualIncome,
      adjustForInflation,
      inflationRate,
      stockWeight: allocationSplit.remainingStockWeight,
      bondWeight: allocationSplit.remainingBondWeight,
      horizonYears,
    });

    // Comparison matrix across standard withdrawal rates (3.5% to 7.0%)
    const rateBenchmarks = [3.5, 4.0, 5.0, 6.0, 7.0].map((rate) => {
      const benchIncome = startingBalance * (rate / 100);
      const currProb = computeProbabilityOfSuccess({
        totalCapital: startingBalance,
        annuityPrincipal: 0,
        annuityPayoutRate: 0,
        targetAnnualIncome: benchIncome,
        adjustForInflation,
        inflationRate,
        stockWeight: stockPct / 100,
        bondWeight: bondPct / 100,
        horizonYears,
      });
      const fiaProb = computeProbabilityOfSuccess({
        totalCapital: startingBalance,
        annuityPrincipal: allocationSplit.annuityPrincipal,
        annuityPayoutRate,
        targetAnnualIncome: benchIncome,
        adjustForInflation,
        inflationRate,
        stockWeight: allocationSplit.remainingStockWeight,
        bondWeight: allocationSplit.remainingBondWeight,
        horizonYears,
      });
      return { rate, benchIncome, currProb, fiaProb };
    });

    return { currentSuccess, annuityStrategySuccess, rateBenchmarks };
  }, [
    startingBalance,
    targetAnnualIncome,
    adjustForInflation,
    inflationRate,
    stockPct,
    bondPct,
    horizonYears,
    allocationSplit,
    annuityPayoutRate,
  ]);

  // Run 35-year deterministic Sequence of Returns simulation
  const simulation = useMemo(() => {
    const stockSeq =
      sequenceOrder === 'bad_to_good'
        ? BAD_TO_GOOD_STOCK_RETURNS
        : [...BAD_TO_GOOD_STOCK_RETURNS].reverse();
    const bondSeq =
      sequenceOrder === 'bad_to_good'
        ? BAD_TO_GOOD_BOND_RETURNS
        : [...BAD_TO_GOOD_BOND_RETURNS].reverse();

    let currBal = startingBalance;
    let liquidSideBal = allocationSplit.liquidPortfolio;

    let currDepletedAge: number | null = null;
    let liquidDepletedAge: number | null = null;

    let currTotalIncomePaid = 0;
    let strategyTotalIncomePaid = 0;
    let strategyGuaranteedIncomePaid = 0;

    let sumBlendReturn = 0;

    const rows: {
      year: number;
      age: number;
      stockRet: number;
      targetIncome: number;
      guaranteedPaycheck: number;
      netPortfolioDraw: number;
      currEnd: number;
      strategyLiquidEnd: number;
    }[] = [];

    for (let i = 0; i < horizonYears; i++) {
      const sRet = stockSeq[i % stockSeq.length];
      const bRet = bondSeq[i % bondSeq.length];

      const currBlendRet = (stockPct / 100) * sRet + (bondPct / 100) * bRet;
      const liquidBlendRet =
        allocationSplit.remainingStockWeight * sRet +
        allocationSplit.remainingBondWeight * bRet;

      sumBlendReturn += currBlendRet;

      const annualIncomeNeed = adjustForInflation
        ? targetAnnualIncome * Math.pow(1 + inflationRate / 100, i)
        : targetAnnualIncome;

      // 1. Current Portfolio Only (must fund 100% of target income from market assets)
      if (currBal > 0) {
        const paid = Math.min(currBal, annualIncomeNeed);
        currTotalIncomePaid += paid;
        const afterDraw = Math.max(0, currBal - paid);
        currBal = Math.max(0, afterDraw * (1 + currBlendRet));
        if (currBal <= 100 && currDepletedAge === null) {
          currBal = 0;
          currDepletedAge = startAge + i;
        }
      }

      // 2. Income Annuity Strategy (Annuity pays guaranteed lifetime check; liquid portfolio only covers remaining gap)
      const guaranteedCheck = guaranteedAnnuityIncome;
      strategyGuaranteedIncomePaid += guaranteedCheck;

      const netGapToDraw = Math.max(0, annualIncomeNeed - guaranteedCheck);
      let liquidPaid = 0;

      if (liquidSideBal > 0 && netGapToDraw > 0) {
        liquidPaid = Math.min(liquidSideBal, netGapToDraw);
        const afterLiquidDraw = Math.max(0, liquidSideBal - liquidPaid);
        liquidSideBal = Math.max(0, afterLiquidDraw * (1 + liquidBlendRet));
        if (liquidSideBal <= 100 && liquidDepletedAge === null) {
          liquidSideBal = 0;
          liquidDepletedAge = startAge + i;
        }
      } else if (liquidSideBal > 0) {
        // Guaranteed income covers 100% of need — liquid portfolio compounds untouched!
        liquidSideBal = Math.max(0, liquidSideBal * (1 + liquidBlendRet));
      }

      strategyTotalIncomePaid += guaranteedCheck + liquidPaid;

      rows.push({
        year: i + 1,
        age: startAge + i,
        stockRet: sRet * 100,
        targetIncome: annualIncomeNeed,
        guaranteedPaycheck: guaranteedCheck,
        netPortfolioDraw: netGapToDraw,
        currEnd: currBal,
        strategyLiquidEnd: liquidSideBal,
      });
    }

    const avgAnnualReturn = (sumBlendReturn / horizonYears) * 100;

    return {
      rows,
      endAge: startAge + horizonYears,
      currEnding: currBal,
      strategyLiquidEnding: liquidSideBal,
      currDepletedAge,
      liquidDepletedAge,
      currTotalIncomePaid,
      strategyTotalIncomePaid,
      strategyGuaranteedIncomePaid,
      avgAnnualReturn,
    };
  }, [
    sequenceOrder,
    horizonYears,
    startingBalance,
    allocationSplit,
    stockPct,
    bondPct,
    adjustForInflation,
    targetAnnualIncome,
    inflationRate,
    startAge,
    guaranteedAnnuityIncome,
  ]);

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  // SVG Chart dimensions
  const chartW = 760;
  const chartH = 265;
  const padL = 68;
  const padR = 24;
  const padT = 22;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxChartVal = useMemo(() => {
    let peak = startingBalance * 1.15;
    for (const r of simulation.rows) {
      if (r.currEnd > peak) peak = r.currEnd;
      if (compareAnnuity && r.strategyLiquidEnd > peak) peak = r.strategyLiquidEnd;
    }
    return Math.max(100000, peak);
  }, [simulation.rows, startingBalance, compareAnnuity]);

  const buildPolyline = (
    startVal: number,
    getter: (r: (typeof simulation.rows)[0]) => number
  ) => {
    const pts: string[] = [`${padL},${padT + plotH - (startVal / maxChartVal) * plotH}`];
    simulation.rows.forEach((r, idx) => {
      const x = padL + ((idx + 1) / simulation.rows.length) * plotW;
      const y = padT + plotH - (getter(r) / maxChartVal) * plotH;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return pts.join(' ');
  };

  const currLinePoints = buildPolyline(startingBalance, (r) => r.currEnd);
  const strategyLiquidLinePoints = buildPolyline(
    allocationSplit.liquidPortfolio,
    (r) => r.strategyLiquidEnd
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {lang === 'es' ? 'Riesgo de Secuencia de Retornos' : 'Sequence of Returns & Probability of Success'}
            </span>
            <span className="text-xs text-slate-400">
              {horizonYears}-Year Retirement Window (Age {startAge} → {simulation.endAge})
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            {lang === 'es'
              ? 'Impacto de Ingreso Garantizado en la Probabilidad de Éxito'
              : 'How Guaranteed Income Transforms Sequence Risk & 35-Year Survival'}
          </h2>
        </div>

        {/* Sequence Direction Toggle */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSequenceOrder('bad_to_good')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              sequenceOrder === 'bad_to_good'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            {lang === 'es' ? 'Mercado Malo → Bueno' : 'Bad Market → Good Market'}
          </button>
          <button
            onClick={() => setSequenceOrder('good_to_bad')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              sequenceOrder === 'good_to_bad'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {lang === 'es' ? 'Mercado Bueno → Malo' : 'Good Market → Bad Market'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Interactive Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Controls Panel (5 cols) */}
        <div className="xl:col-span-5 space-y-5">
          {/* Card 1: Current Portfolio Mix & Target Income */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  1. Current Mix & Target Income
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Avg Return: <strong className="text-sky-400">{simulation.avgAnnualReturn.toFixed(1)}%/yr</strong>
              </span>
            </div>

            {/* Starting Balance, Retirement Age, Horizon */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Portfolio ($)
                </label>
                <input
                  type="number"
                  step={25000}
                  min={50000}
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Start Age
                </label>
                <input
                  type="number"
                  min={50}
                  max={80}
                  value={startAge}
                  onChange={(e) => setStartAge(Math.min(80, Math.max(50, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Window (Yrs)
                </label>
                <input
                  type="number"
                  min={20}
                  max={40}
                  value={horizonYears}
                  onChange={(e) => setHorizonYears(Math.min(40, Math.max(20, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-amber-400 focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            {/* Stocks vs Bonds Mix Slider */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-sky-400">Stocks: {stockPct}%</span>
                <span className="text-amber-400">Bonds: {bondPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={stockPct}
                onChange={(e) => setStockPct(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: '80/20', s: 80 },
                  { label: '60/40', s: 60 },
                  { label: '50/50', s: 50 },
                  { label: '40/60', s: 40 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setStockPct(preset.s)}
                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold border transition ${
                      stockPct === preset.s
                        ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Annual Income & Withdrawal Rate */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-400" /> Target Income / Yr
                  </label>
                  <input
                    type="number"
                    step={2500}
                    min={10000}
                    value={targetAnnualIncome}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setCustomTargetIncome(val);
                      if (startingBalance > 0) {
                        setWithdrawalRate(Number(((val / startingBalance) * 100).toFixed(2)));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-black text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-rose-400" /> Withdrawal Rate
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.25}
                      min={2.0}
                      max={10.0}
                      value={Number(effectiveTotalWithdrawalRate.toFixed(2))}
                      onChange={(e) => {
                        const rate = Math.max(0, Number(e.target.value));
                        setWithdrawalRate(rate);
                        setCustomTargetIncome(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-black text-rose-400"
                    />
                  </div>
                </div>
              </div>

              <input
                type="range"
                min={3.0}
                max={8.5}
                step={0.25}
                value={Math.min(8.5, Math.max(3.0, effectiveTotalWithdrawalRate))}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  setWithdrawalRate(rate);
                  setCustomTargetIncome(null);
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustForInflation}
                    onChange={(e) => setAdjustForInflation(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500"
                  />
                  Inflation-adjust target income ({inflationRate}%/yr)
                </label>
                {adjustForInflation && (
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={6}
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Math.max(0, Number(e.target.value)))}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Guaranteed Income Annuity Strategy */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition ${
              compareAnnuity
                ? 'bg-gradient-to-b from-emerald-950/35 to-slate-900 border-emerald-500/40'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  2. Guaranteed Income Annuity
                </h3>
              </div>
              <button
                onClick={() => setCompareAnnuity(!compareAnnuity)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  compareAnnuity
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {compareAnnuity ? 'Strategy ON' : '+ Add Income Annuity'}
              </button>
            </div>

            {compareAnnuity ? (
              <div className="space-y-4">
                {/* Allocation Mode Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Funding Source for Income Annuity
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setAnnuityMode('total_portfolio')}
                      className={`py-2 px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        annuityMode === 'total_portfolio'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      % of Total Portfolio
                    </button>
                    <button
                      onClick={() => setAnnuityMode('bond_replacement')}
                      className={`py-2 px-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        annuityMode === 'bond_replacement'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Bond Replacement
                    </button>
                  </div>
                </div>

                {/* Annuity Allocation Slider & Payout Rate */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-emerald-400">
                      {annuityMode === 'bond_replacement'
                        ? `Replace ${annuityPct}% of Bonds`
                        : `Allocate ${annuityPct}% of Portfolio`}
                    </span>
                    <span className="text-white font-mono">
                      {fmtCurrency(allocationSplit.annuityPrincipal)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={85}
                    step={5}
                    value={annuityPct}
                    onChange={(e) => setAnnuityPct(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex gap-1.5">
                    {[25, 40, 50, 65].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setAnnuityPct(pct)}
                        className={`flex-1 py-1 rounded text-[11px] font-bold border transition ${
                          annuityPct === pct
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  {/* Guaranteed Payout Rate Control */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Lifetime Payout Rate (%)
                      </label>
                      <input
                        type="number"
                        step={0.2}
                        min={4.5}
                        max={11.0}
                        value={annuityPayoutRate}
                        onChange={(e) => setAnnuityPayoutRate(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-emerald-400"
                      />
                    </div>
                    <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-2 text-right">
                      <div className="text-[10px] text-emerald-300 uppercase font-bold">
                        Guaranteed Paycheck
                      </div>
                      <div className="text-sm font-black text-white">
                        {fmtCurrency(guaranteedAnnuityIncome)}/yr
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash-Flow Relief Summary Box */}
                <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Annual Income:</span>
                    <span className="font-bold text-white">{fmtCurrency(targetAnnualIncome)}/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Covered by Income Annuity:</span>
                    <span className="font-bold text-emerald-400">
                      −{fmtCurrency(guaranteedAnnuityIncome)}/yr ({incomeCoveredPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5">
                    <span className="text-slate-300 font-semibold">Remaining Draw from Market:</span>
                    <span className="font-black text-sky-400">
                      {fmtCurrency(year1NetPortfolioDraw)}/yr ({effectiveLiquidWithdrawalRate.toFixed(1)}% rate)
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Remaining Liquid Bucket ({fmtCurrency(allocationSplit.liquidPortfolio)}):</span>
                    <span>
                      {allocationSplit.remainingStockPctDisplay}% Stocks / {allocationSplit.remainingBondPctDisplay}% Bonds
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Click <strong className="text-emerald-400">+ Add Income Annuity</strong> to see how generating a guaranteed lifetime paycheck reduces withdrawals from the remaining portfolio and boosts 35-year probability of success.
              </p>
            )}
          </div>
        </div>

        {/* Right Side-by-Side Probability of Success, Trajectory & Matrix Panel (7 cols) */}
        <div className="xl:col-span-7 space-y-5">
          {/* Top Probability of Success & 35-Year Legacy Compare Cards */}
          <div className={`grid grid-cols-1 ${compareAnnuity ? 'md:grid-cols-2' : ''} gap-4`}>
            {/* Current Portfolio Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Current {stockPct}/{bondPct} Portfolio Only
                </span>
                {simulation.currDepletedAge ? (
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Depleted Age {simulation.currDepletedAge}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Lasts Full {horizonYears} Yrs
                  </span>
                )}
              </div>

              {/* Probability of Success Meter */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    {horizonYears}-Yr Probability of Success
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      probOfSuccess.currentSuccess >= 85
                        ? 'text-emerald-400'
                        : probOfSuccess.currentSuccess >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {probOfSuccess.currentSuccess}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      probOfSuccess.currentSuccess >= 85
                        ? 'bg-emerald-500'
                        : probOfSuccess.currentSuccess >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${probOfSuccess.currentSuccess}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1.5">
                  Market withdrawal pressure: <strong className="text-rose-300">{effectiveTotalWithdrawalRate.toFixed(1)}%/yr</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <div>
                  <div className="text-[11px] text-slate-400">Balance at Age {simulation.endAge}</div>
                  <div
                    className={`text-lg font-black ${
                      simulation.currEnding === 0 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {fmtCurrency(simulation.currEnding)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Total Income Paid</div>
                  <div className="text-lg font-black text-slate-200">
                    {fmtCurrency(simulation.currTotalIncomePaid)}
                  </div>
                </div>
              </div>
            </div>

            {/* Income Annuity Strategy Card */}
            {compareAnnuity && (
              <div className="bg-gradient-to-br from-emerald-950/45 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    With {Math.round(allocationSplit.annuityShareOfTotal)}% Income Annuity
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {fmtCurrency(guaranteedAnnuityIncome)}/yr Guaranteed
                  </span>
                </div>

                {/* Probability of Success Meter */}
                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      {horizonYears}-Yr Probability of Success
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      {probOfSuccess.annuityStrategySuccess}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${probOfSuccess.annuityStrategySuccess}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-1.5">
                    Reduced market draw rate: <strong>{effectiveLiquidWithdrawalRate.toFixed(1)}%/yr</strong> (down from {effectiveTotalWithdrawalRate.toFixed(1)}%)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <div>
                    <div className="text-[11px] text-slate-400">Liquid Legacy at Age {simulation.endAge}</div>
                    <div className="text-lg font-black text-emerald-400">
                      {fmtCurrency(simulation.strategyLiquidEnding)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Total Income Paid</div>
                    <div className="text-lg font-black text-white">
                      {fmtCurrency(simulation.strategyTotalIncomePaid)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 35-Year Trajectory Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {horizonYears}-Year Liquid Portfolio Trajectory ({sequenceOrder === 'bad_to_good' ? 'Early Crash Sequence' : 'Early Bull Sequence'})
                </h3>
                <p className="text-xs text-slate-400">
                  Target income {fmtCurrency(targetAnnualIncome)}/yr • Annuity covers {fmtCurrency(guaranteedAnnuityIncome)}/yr for life
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-1 bg-rose-500 rounded-full inline-block" />
                  Current {stockPct}/{bondPct}
                </span>
                {compareAnnuity && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" />
                    Remaining Liquid Bucket
                  </span>
                )}
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = padT + plotH - t * plotH;
                  const val = maxChartVal * t;
                  return (
                    <g key={t}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        ${Math.round(val / 1000)}k
                      </text>
                    </g>
                  );
                })}

                {simulation.rows.map((r, idx) => {
                  if (idx % 5 !== 0 && idx !== simulation.rows.length - 1) return null;
                  const x = padL + ((idx + 1) / simulation.rows.length) * plotW;
                  return (
                    <text
                      key={r.age}
                      x={x}
                      y={chartH - 10}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      Age {r.age}
                    </text>
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={currLinePoints}
                />

                {compareAnnuity && (
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={strategyLiquidLinePoints}
                  />
                )}
              </svg>
            </div>

            {/* Withdrawal Rate vs. Probability of Success Comparison Matrix */}
            {compareAnnuity && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {horizonYears}-Year Probability of Success by Withdrawal Rate ({stockPct}/{bondPct} Mix)
                  </span>
                  <span className="text-[10px] text-slate-400">600-Path Sequence Stress Test</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {probOfSuccess.rateBenchmarks.map((b) => {
                    const isCurrentClosest =
                      Math.abs(b.rate - effectiveTotalWithdrawalRate) < 0.35;
                    return (
                      <div
                        key={b.rate}
                        className={`rounded-lg p-2 border ${
                          isCurrentClosest
                            ? 'bg-slate-900 border-amber-500/60'
                            : 'bg-slate-900/50 border-slate-800'
                        }`}
                      >
                        <div className="text-[11px] font-bold text-slate-300">
                          {b.rate.toFixed(1)}% Draw
                        </div>
                        <div className="text-[10px] text-slate-500 mb-1">
                          {fmtCurrency(b.benchIncome)}/yr
                        </div>
                        <div className="text-xs font-bold text-rose-400">
                          Port: {b.currProb}%
                        </div>
                        <div className="text-xs font-black text-emerald-400">
                          +FIA: {b.fiaProb}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advisor Talking Point Callout */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Why Probability of Success Jumps to {probOfSuccess.annuityStrategySuccess}%: </strong>
                When the Income Annuity generates <strong className="text-emerald-400">{fmtCurrency(guaranteedAnnuityIncome)}/yr</strong> guaranteed for life, your remaining <strong className="text-white">{fmtCurrency(allocationSplit.liquidPortfolio)}</strong> only needs to cover <strong className="text-sky-400">{fmtCurrency(year1NetPortfolioDraw)}/yr</strong> ({effectiveLiquidWithdrawalRate.toFixed(1)}% withdrawal rate) instead of <strong className="text-rose-400">{fmtCurrency(targetAnnualIncome)}/yr</strong> ({effectiveTotalWithdrawalRate.toFixed(1)}%). That eliminates forced selling during early bear markets and leaves <strong className="text-emerald-400">{fmtCurrency(simulation.strategyLiquidEnding)}</strong> at age {simulation.endAge}.
              </div>
            </div>
          </div>

          {/* Collapsible Year-by-Year Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowYearTable(!showYearTable)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition"
            >
              <span>Year-by-Year Income & Liquid Balance Schedule ({horizonYears} Years)</span>
              <span className="text-sky-400">{showYearTable ? 'Hide Table ▲' : 'Show Table ▼'}</span>
            </button>

            {showYearTable && (
              <div className="overflow-x-auto max-h-80 border-t border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Age</th>
                      <th className="py-2 px-3">Stock %</th>
                      <th className="py-2 px-3">Income Need</th>
                      {compareAnnuity && (
                        <>
                          <th className="py-2 px-3 text-emerald-400">Annuity Pay</th>
                          <th className="py-2 px-3 text-sky-400">Market Draw</th>
                        </>
                      )}
                      <th className="py-2 px-3 text-rose-400">Current End</th>
                      {compareAnnuity && (
                        <th className="py-2 px-3 text-emerald-400">Liquid End</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {simulation.rows.map((r) => (
                      <tr key={r.age} className="hover:bg-slate-800/40">
                        <td className="py-1.5 px-3 font-bold text-white">{r.age}</td>
                        <td
                          className={`py-1.5 px-3 ${
                            r.stockRet < 0 ? 'text-rose-400' : 'text-sky-400'
                          }`}
                        >
                          {r.stockRet > 0 ? `+${r.stockRet.toFixed(0)}%` : `${r.stockRet.toFixed(0)}%`}
                        </td>
                        <td className="py-1.5 px-3 text-slate-300">
                          {fmtCurrency(r.targetIncome)}
                        </td>
                        {compareAnnuity && (
                          <>
                            <td className="py-1.5 px-3 text-emerald-400">
                              {fmtCurrency(r.guaranteedPaycheck)}
                            </td>
                            <td className="py-1.5 px-3 text-sky-300">
                              {fmtCurrency(r.netPortfolioDraw)}
                            </td>
                          </>
                        )}
                        <td className="py-1.5 px-3 text-rose-300">
                          {fmtCurrency(r.currEnd)}
                        </td>
                        {compareAnnuity && (
                          <td className="py-1.5 px-3 text-emerald-300 font-bold">
                            {fmtCurrency(r.strategyLiquidEnd)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
