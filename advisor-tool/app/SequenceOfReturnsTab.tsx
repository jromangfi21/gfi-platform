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
} from 'lucide-react';

interface SequenceOfReturnsTabProps {
  initialPortfolio?: number;
  retirementAge?: number;
  lang?: 'en' | 'es';
}

// 30-year realistic market return sequence (geometric mean ~6.8%, arithmetic mean ~7.9%)
// Bad-to-Good starts with a severe 3-year bear market (-22%, -14%, -9%) right at retirement
const BAD_TO_GOOD_STOCK_RETURNS = [
  -0.22, -0.14, -0.09, 0.16, 0.11, -0.04, 0.18, 0.14, 0.08, -0.06,
  0.19, 0.13, 0.09, 0.15, -0.03, 0.17, 0.12, 0.10, 0.14, -0.05,
  0.21, 0.15, 0.11, 0.16, 0.09, 0.18, 0.14, 0.12, 0.19, 0.15,
];

const BAD_TO_GOOD_BOND_RETURNS = [
  0.04, 0.05, 0.03, 0.02, 0.04, 0.06, 0.03, 0.02, 0.04, 0.05,
  0.03, 0.04, 0.04, 0.03, 0.05, 0.03, 0.04, 0.04, 0.03, 0.05,
  0.03, 0.04, 0.04, 0.03, 0.04, 0.03, 0.04, 0.04, 0.03, 0.04,
];

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
  const [stockPct, setStockPct] = useState<number>(60);
  const [withdrawalRate, setWithdrawalRate] = useState<number>(5.0);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(true);
  const [inflationRate, setInflationRate] = useState<number>(2.5);

  // Sequence Mode: 'bad_to_good' vs 'good_to_bad'
  const [sequenceOrder, setSequenceOrder] = useState<'bad_to_good' | 'good_to_bad'>('bad_to_good');

  // Indexed Annuity Compare & Contrast State
  const [compareAnnuity, setCompareAnnuity] = useState<boolean>(true);
  const [annuityMode, setAnnuityMode] = useState<'total_portfolio' | 'bond_replacement'>('total_portfolio');
  const [annuityPct, setAnnuityPct] = useState<number>(50);
  const [fiaCapRate, setFiaCapRate] = useState<number>(9.5);
  const [fiaFloorRate, setFiaFloorRate] = useState<number>(0.0);
  const [fiaFeeRate, setFiaFeeRate] = useState<number>(0.0);
  const [showYearTable, setShowYearTable] = useState<boolean>(false);

  const bondPct = Math.max(0, 100 - stockPct);

  // Compute effective sleeve weights when FIA is incorporated
  const sleeveWeights = useMemo(() => {
    if (!compareAnnuity || annuityPct <= 0) {
      return {
        fia: 0,
        stocks: stockPct / 100,
        bonds: bondPct / 100,
      };
    }

    if (annuityMode === 'bond_replacement') {
      // Replace X% of the bond allocation with FIA; keep stocks intact
      const replacedBonds = (bondPct * annuityPct) / 100;
      const remainingBonds = bondPct - replacedBonds;
      return {
        fia: replacedBonds / 100,
        stocks: stockPct / 100,
        bonds: remainingBonds / 100,
      };
    } else {
      // Replace X% of total portfolio with FIA; scale stocks & bonds proportionally
      const fiaShare = Math.min(100, Math.max(0, annuityPct)) / 100;
      const remaining = 1 - fiaShare;
      return {
        fia: fiaShare,
        stocks: (stockPct / 100) * remaining,
        bonds: (bondPct / 100) * remaining,
      };
    }
  }, [compareAnnuity, annuityMode, annuityPct, stockPct, bondPct]);

  // Run 30-year simulation for both Current Portfolio and FIA-Enhanced Portfolio
  const simulation = useMemo(() => {
    const stockSeq =
      sequenceOrder === 'bad_to_good'
        ? BAD_TO_GOOD_STOCK_RETURNS
        : [...BAD_TO_GOOD_STOCK_RETURNS].reverse();
    const bondSeq =
      sequenceOrder === 'bad_to_good'
        ? BAD_TO_GOOD_BOND_RETURNS
        : [...BAD_TO_GOOD_BOND_RETURNS].reverse();

    const years = Math.min(30, Math.max(15, 95 - startAge));
    const baseWithdrawal = startingBalance * (withdrawalRate / 100);

    let currBal = startingBalance;
    let fiaPortfolioBal = startingBalance;

    let currDepletedAge: number | null = null;
    let fiaDepletedAge: number | null = null;

    let currTotalWithdrawn = 0;
    let fiaTotalWithdrawn = 0;

    // Average annual return calculation (identical regardless of order)
    let sumBlendReturn = 0;

    const rows: {
      year: number;
      age: number;
      stockRet: number;
      bondRet: number;
      fiaRet: number;
      withdrawalTarget: number;
      currStart: number;
      currEnd: number;
      fiaStart: number;
      fiaEnd: number;
    }[] = [];

    for (let i = 0; i < years; i++) {
      const sRet = stockSeq[i % stockSeq.length];
      const bRet = bondSeq[i % bondSeq.length];

      // Indexed annuity return: 0% floor, capped at fiaCapRate%, minus optional rider fee
      const rawIndexCredit = Math.max(fiaFloorRate / 100, Math.min(fiaCapRate / 100, sRet));
      const netFiaRet = rawIndexCredit - fiaFeeRate / 100;

      const currBlendRet = (stockPct / 100) * sRet + (bondPct / 100) * bRet;
      const fiaBlendRet =
        sleeveWeights.stocks * sRet +
        sleeveWeights.bonds * bRet +
        sleeveWeights.fia * netFiaRet;

      sumBlendReturn += currBlendRet;

      const annualWithdrawal = adjustForInflation
        ? baseWithdrawal * Math.pow(1 + inflationRate / 100, i)
        : baseWithdrawal;

      const currStart = currBal;
      const fiaStart = fiaPortfolioBal;

      // Beginning-of-year withdrawal (standard retirement income distribution stress test)
      if (currBal > 0) {
        const actualCurrWithdraw = Math.min(currBal, annualWithdrawal);
        currTotalWithdrawn += actualCurrWithdraw;
        const afterWithdraw = Math.max(0, currBal - actualCurrWithdraw);
        currBal = Math.max(0, afterWithdraw * (1 + currBlendRet));
        if (currBal <= 100 && currDepletedAge === null) {
          currBal = 0;
          currDepletedAge = startAge + i;
        }
      }

      if (fiaPortfolioBal > 0) {
        const actualFiaWithdraw = Math.min(fiaPortfolioBal, annualWithdrawal);
        fiaTotalWithdrawn += actualFiaWithdraw;
        const afterWithdrawFia = Math.max(0, fiaPortfolioBal - actualFiaWithdraw);
        fiaPortfolioBal = Math.max(0, afterWithdrawFia * (1 + fiaBlendRet));
        if (fiaPortfolioBal <= 100 && fiaDepletedAge === null) {
          fiaPortfolioBal = 0;
          fiaDepletedAge = startAge + i;
        }
      }

      rows.push({
        year: i + 1,
        age: startAge + i,
        stockRet: sRet * 100,
        bondRet: bRet * 100,
        fiaRet: netFiaRet * 100,
        withdrawalTarget: annualWithdrawal,
        currStart,
        currEnd: currBal,
        fiaStart,
        fiaEnd: fiaPortfolioBal,
      });
    }

    const avgAnnualReturn = (sumBlendReturn / years) * 100;

    return {
      rows,
      years,
      endAge: startAge + years,
      baseWithdrawal,
      currEnding: currBal,
      fiaEnding: fiaPortfolioBal,
      currDepletedAge,
      fiaDepletedAge,
      currTotalWithdrawn,
      fiaTotalWithdrawn,
      avgAnnualReturn,
    };
  }, [
    sequenceOrder,
    startAge,
    startingBalance,
    withdrawalRate,
    adjustForInflation,
    inflationRate,
    stockPct,
    bondPct,
    sleeveWeights,
    fiaFloorRate,
    fiaCapRate,
    fiaFeeRate,
  ]);

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  // SVG Chart dimensions
  const chartW = 760;
  const chartH = 270;
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
      if (compareAnnuity && r.fiaEnd > peak) peak = r.fiaEnd;
    }
    return Math.max(100000, peak);
  }, [simulation.rows, startingBalance, compareAnnuity]);

  const buildPolyline = (getter: (r: (typeof simulation.rows)[0]) => number) => {
    const pts: string[] = [`${padL},${padT + plotH - (startingBalance / maxChartVal) * plotH}`];
    simulation.rows.forEach((r, idx) => {
      const x = padL + ((idx + 1) / simulation.rows.length) * plotW;
      const y = padT + plotH - (getter(r) / maxChartVal) * plotH;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return pts.join(' ');
  };

  const currLinePoints = buildPolyline((r) => r.currEnd);
  const fiaLinePoints = buildPolyline((r) => r.fiaEnd);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {lang === 'es' ? 'Riesgo de Secuencia de Retornos' : 'Sequence of Returns Risk Analyzer'}
            </span>
            <span className="text-xs text-slate-400">
              {lang === 'es'
                ? 'Mismo retorno promedio • El orden determina la longevidad'
                : 'Same average return • Order of returns decides when money runs out'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            {lang === 'es'
              ? 'Impacto de Caídas Tempranas y Protección con Anualidad Indexada'
              : 'Portfolio Longevity Stress-Test vs. Indexed Annuity Protection'}
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
          {/* Card 1: Current Portfolio Allocation & Withdrawal Rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  1. Current Portfolio & Withdrawal
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Avg Return: <strong className="text-sky-400">{simulation.avgAnnualReturn.toFixed(1)}%/yr</strong>
              </span>
            </div>

            {/* Starting Balance & Retirement Age */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Starting Portfolio ($)
                </label>
                <input
                  type="number"
                  step={25000}
                  min={50000}
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Retirement Age
                </label>
                <input
                  type="number"
                  min={50}
                  max={85}
                  value={startAge}
                  onChange={(e) => setStartAge(Math.min(85, Math.max(50, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-sky-500 outline-none"
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
                  { label: '80/20 Growth', s: 80 },
                  { label: '60/40 Balanced', s: 60 },
                  { label: '50/50 Moderate', s: 50 },
                  { label: '40/60 Conservative', s: 40 },
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

            {/* Withdrawal Rate Slider + Inflation Toggle */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">
                  Initial Withdrawal Rate: <span className="text-rose-400">{withdrawalRate.toFixed(1)}%</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {fmtCurrency(simulation.baseWithdrawal)}/yr
                </span>
              </div>
              <input
                type="range"
                min={2.5}
                max={9.0}
                step={0.5}
                value={withdrawalRate}
                onChange={(e) => setWithdrawalRate(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustForInflation}
                    onChange={(e) => setAdjustForInflation(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500"
                  />
                  Adjust withdrawals for inflation ({inflationRate}%/yr)
                </label>
                {adjustForInflation && (
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={6}
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Indexed Annuity Compare & Contrast Toggle */}
          <div
            className={`border rounded-xl p-5 space-y-4 transition ${
              compareAnnuity
                ? 'bg-gradient-to-b from-emerald-950/30 to-slate-900 border-emerald-500/40'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  2. Indexed Annuity Compare & Contrast
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
                {compareAnnuity ? 'Comparison ON' : '+ Incorporate FIA'}
              </button>
            </div>

            {compareAnnuity ? (
              <div className="space-y-4">
                {/* Allocation Mode Selector: Total Portfolio % vs Bond Replacement */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                    How to Incorporate Indexed Annuity
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

                {/* FIA Percentage Slider + Quick Presets */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-emerald-400">
                      {annuityMode === 'bond_replacement'
                        ? `Replace ${annuityPct}% of Bonds with FIA`
                        : `Allocate ${annuityPct}% of Portfolio to FIA`}
                    </span>
                    <span className="text-slate-300 font-mono">
                      {fmtCurrency(startingBalance * sleeveWeights.fia)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={annuityPct}
                    onChange={(e) => setAnnuityPct(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[25, 50, 75, 100].map((pct) => (
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

                  {/* Resulting New Mix Breakdown Pill */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">New Portfolio Mix:</span>
                    <span className="font-bold text-white">
                      <span className="text-sky-400">{Math.round(sleeveWeights.stocks * 100)}% Stocks</span>
                      {' • '}
                      <span className="text-amber-400">{Math.round(sleeveWeights.bonds * 100)}% Bonds</span>
                      {' • '}
                      <span className="text-emerald-400">{Math.round(sleeveWeights.fia * 100)}% FIA</span>
                    </span>
                  </div>
                </div>

                {/* FIA Floor / Cap / Rider Fee Controls */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      FIA Floor (%)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={3}
                      value={fiaFloorRate}
                      onChange={(e) => setFiaFloorRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Annual Cap (%)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={4}
                      max={18}
                      value={fiaCapRate}
                      onChange={(e) => setFiaCapRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Rider Fee (%)
                    </label>
                    <input
                      type="number"
                      step={0.25}
                      min={0}
                      max={2.0}
                      value={fiaFeeRate}
                      onChange={(e) => setFiaFeeRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-300"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Click <strong className="text-emerald-400">+ Incorporate FIA</strong> to compare replacing a percentage of bonds or total portfolio with a 0%-floor Fixed Indexed Annuity under the exact same market sequence.
              </p>
            )}
          </div>
        </div>

        {/* Right Side-by-Side Comparison & Chart Panel (7 cols) */}
        <div className="xl:col-span-7 space-y-5">
          {/* Top KPI Compare & Contrast Cards */}
          <div className={`grid grid-cols-1 ${compareAnnuity ? 'md:grid-cols-2' : ''} gap-4`}>
            {/* Current Portfolio Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Current {stockPct}/{bondPct} Portfolio
                </span>
                {simulation.currDepletedAge ? (
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Runs Out at Age {simulation.currDepletedAge}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Survives to Age {simulation.endAge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[11px] text-slate-400">Balance at Age {simulation.endAge}</div>
                  <div
                    className={`text-xl font-black ${
                      simulation.currEnding === 0 ? 'text-rose-400' : 'text-white'
                    }`}
                  >
                    {fmtCurrency(simulation.currEnding)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Total Income Delivered</div>
                  <div className="text-xl font-black text-slate-200">
                    {fmtCurrency(simulation.currTotalWithdrawn)}
                  </div>
                </div>
              </div>
            </div>

            {/* Indexed Annuity Enhanced Card */}
            {compareAnnuity && (
              <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    With {Math.round(sleeveWeights.fia * 100)}% Indexed Annuity ({fiaFloorRate}% Floor)
                  </span>
                  {simulation.fiaDepletedAge ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                      Runs Out at Age {simulation.fiaDepletedAge}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Survives to Age {simulation.endAge}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="text-[11px] text-slate-400">Balance at Age {simulation.endAge}</div>
                    <div className="text-xl font-black text-emerald-400">
                      {fmtCurrency(simulation.fiaEnding)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Total Income Delivered</div>
                    <div className="text-xl font-black text-white">
                      {fmtCurrency(simulation.fiaTotalWithdrawn)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trajectory Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Portfolio Balance Trajectory ({sequenceOrder === 'bad_to_good' ? 'Early Crash Sequence' : 'Early Bull Sequence'})
                </h3>
                <p className="text-xs text-slate-400">
                  Withdrawals of {fmtCurrency(simulation.baseWithdrawal)}/yr starting at age {startAge}
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
                    With {Math.round(sleeveWeights.fia * 100)}% FIA
                  </span>
                )}
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {/* Horizontal gridlines */}
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

                {/* Age labels on X-axis */}
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

                {/* Current Portfolio Line */}
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={currLinePoints}
                />

                {/* FIA Portfolio Line */}
                {compareAnnuity && (
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={fiaLinePoints}
                  />
                )}
              </svg>
            </div>

            {/* Advisor Talking Point Callout */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Advisor Insight: </strong>
                {sequenceOrder === 'bad_to_good' ? (
                  <>
                    Even though this 30-year sequence averages{' '}
                    <strong className="text-sky-400">{simulation.avgAnnualReturn.toFixed(1)}%/yr</strong>, taking{' '}
                    <strong className="text-rose-400">{withdrawalRate.toFixed(1)}%</strong> withdrawals during early down years locks in permanent losses. Switch to{' '}
                    <button
                      onClick={() => setSequenceOrder('good_to_bad')}
                      className="underline text-emerald-400 font-bold hover:text-emerald-300"
                    >
                      Good Market → Bad Market
                    </button>{' '}
                    to show the client how the exact same returns in reverse order produce a dramatically different outcome.
                  </>
                ) : (
                  <>
                    With strong returns early in retirement, the portfolio builds a cushion before later downturns hit. Toggle back to{' '}
                    <button
                      onClick={() => setSequenceOrder('bad_to_good')}
                      className="underline text-rose-400 font-bold hover:text-rose-300"
                    >
                      Bad Market → Good Market
                    </button>{' '}
                    to show how a 0%-floor Indexed Annuity protects against retiring right before a downturn.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Year-by-Year Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowYearTable(!showYearTable)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition"
            >
              <span>Year-by-Year Sequence & Withdrawal Breakdown</span>
              <span className="text-sky-400">{showYearTable ? 'Hide Table ▲' : 'Show Table ▼'}</span>
            </button>

            {showYearTable && (
              <div className="overflow-x-auto max-h-80 border-t border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Age</th>
                      <th className="py-2 px-3">Stock %</th>
                      <th className="py-2 px-3">FIA %</th>
                      <th className="py-2 px-3">Withdrawal</th>
                      <th className="py-2 px-3 text-rose-400">Current End</th>
                      {compareAnnuity && (
                        <th className="py-2 px-3 text-emerald-400">With FIA End</th>
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
                        <td className="py-1.5 px-3 text-emerald-400">
                          +{r.fiaRet.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-3 text-slate-300">
                          {fmtCurrency(r.withdrawalTarget)}
                        </td>
                        <td className="py-1.5 px-3 text-rose-300">
                          {fmtCurrency(r.currEnd)}
                        </td>
                        {compareAnnuity && (
                          <td className="py-1.5 px-3 text-emerald-300 font-bold">
                            {fmtCurrency(r.fiaEnd)}
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
