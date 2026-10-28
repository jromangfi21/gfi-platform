export type BacktestPeriod = '2000_2010' | '2008_2018' | '2015_2025' | 'all_25_years';
export type BondType = 'corporate_ig' | 'high_yield' | 'aggregate';

export interface BacktestYearData {
  year: number;
  calendarYear: number;
  sp500Return: number;
  selectedBondReturn: number;
  equityBalance: number;
  fiaBalance: number;
  fixedAnnuityBalance: number;
  traditional6040Balance: number;
  modernized6040FiaBalance: number;
  fiaInterestCredited: number;
  isFloorProtected: boolean;
}

export interface WealthLogixBacktestParams {
  initialDeposit: number;
  annualWithdrawal: number;
  period: BacktestPeriod;
  bondType?: BondType;
  fiaCap: number;
  fiaFloor: number;
  fiaParticipation: number;
  fixedRate: number;
  taxRateOnFixed: number;
  // Blend Sub-Strategy Parameters
  fiaIndexedAllocationPct?: number; // e.g. 0.80 (80%)
  fiaFixedAllocationRate?: number;   // e.g. 0.03 (3.0% yield)
}

export interface WealthLogixBacktestOutput {
  results: BacktestYearData[];
  finalEquity: number;
  finalFia: number;
  finalFixed: number;
  finalTraditional6040: number;
  finalModernized6040Fia: number;
  zeroLossYearsCount: number;
}

const HISTORICAL_DATA: Record<number, { sp500: number; agg: number; corp: number; hy: number }> = {
  2000: { sp500: -9.10, agg: 11.63, corp: 9.38, hy: -5.86 },
  2001: { sp500: -11.89, agg: 8.44, corp: 10.36, hy: 5.28 },
  2002: { sp500: -22.10, agg: 10.26, corp: 10.01, hy: -1.41 },
  2003: { sp500: 28.68, agg: 4.10, corp: 8.35, hy: 28.97 },
  2004: { sp500: 10.88, agg: 4.34, corp: 5.38, hy: 11.13 },
  2005: { sp500: 4.91, agg: 2.43, corp: 1.68, hy: 2.74 },
  2006: { sp500: 15.79, agg: 4.33, corp: 4.30, hy: 11.85 },
  2007: { sp500: 5.49, agg: 6.97, corp: 4.56, hy: 1.87 },
  2008: { sp500: -37.00, agg: 5.24, corp: -4.94, hy: -26.16 },
  2009: { sp500: 26.46, agg: 5.93, corp: 18.68, hy: 58.21 },
  2010: { sp500: 15.06, agg: 6.54, corp: 9.47, hy: 15.12 },
  2011: { sp500: 2.11, agg: 7.84, corp: 8.15, hy: 4.98 },
  2012: { sp500: 16.00, agg: 4.22, corp: 9.82, hy: 15.81 },
  2013: { sp500: 32.39, agg: -2.02, corp: -1.53, hy: 7.44 },
  2014: { sp500: 13.69, agg: 5.97, corp: 7.46, hy: 2.45 },
  2015: { sp500: 1.38, agg: 0.55, corp: -0.68, hy: -4.47 },
  2016: { sp500: 11.96, agg: 2.65, corp: 6.11, hy: 17.13 },
  2017: { sp500: 21.83, agg: 3.54, corp: 6.42, hy: 7.50 },
  2018: { sp500: -4.38, agg: 0.01, corp: -2.51, hy: -2.08 },
  2019: { sp500: 31.49, agg: 8.72, corp: 14.54, hy: 14.32 },
  2020: { sp500: 18.40, agg: 7.51, corp: 9.89, hy: 7.11 },
  2021: { sp500: 28.71, agg: -1.54, corp: -1.04, hy: 5.28 },
  2022: { sp500: -18.11, agg: -13.01, corp: -15.76, hy: -11.19 },
  2023: { sp500: 26.29, agg: 5.53, corp: 8.52, hy: 13.44 },
  2024: { sp500: 25.02, agg: 1.25, corp: 2.13, hy: 8.19 },
};

export function runWealthLogixBacktest(params: WealthLogixBacktestParams): WealthLogixBacktestOutput {
  const {
    initialDeposit,
    annualWithdrawal,
    period,
    bondType = 'corporate_ig',
    fiaCap,
    fiaFloor = 0.0,
    fiaParticipation = 1.0,
    fixedRate,
    taxRateOnFixed = 0.24,
    fiaIndexedAllocationPct = 0.80, // 80% default S&P
    fiaFixedAllocationRate = 0.03,  // 3.0% fixed yield
  } = params;

  const fiaFixedAllocationPct = 1 - fiaIndexedAllocationPct; // e.g. 20%

  let startYear = 2000;
  let endYear = 2010;

  if (period === '2008_2018') {
    startYear = 2008;
    endYear = 2018;
  } else if (period === '2015_2025') {
    startYear = 2015;
    endYear = 2024;
  } else if (period === 'all_25_years') {
    startYear = 2000;
    endYear = 2024;
  }

  let equityBal = initialDeposit;
  let fiaBal = initialDeposit;
  let fixedBal = initialDeposit;
  let trad6040Bal = initialDeposit;
  let mod6040FiaBal = initialDeposit;

  const afterTaxFixedRate = fixedRate * (1 - taxRateOnFixed);
  let zeroLossCount = 0;
  const results: BacktestYearData[] = [];

  let idx = 1;
  for (let y = startYear; y <= endYear; y++) {
    const market = HISTORICAL_DATA[y] || { sp500: 6.5, agg: 3.5, corp: 4.0, hy: 6.0 };
    const spRaw = market.sp500;
    
    let bondRaw = market.corp;
    if (bondType === 'high_yield') bondRaw = market.hy;
    if (bondType === 'aggregate') bondRaw = market.agg;

    equityBal = Math.max(0, equityBal - annualWithdrawal);
    fiaBal = Math.max(0, fiaBal - annualWithdrawal);
    fixedBal = Math.max(0, fixedBal - annualWithdrawal);
    trad6040Bal = Math.max(0, trad6040Bal - annualWithdrawal);
    mod6040FiaBal = Math.max(0, mod6040FiaBal - annualWithdrawal);

    // 1. S&P 500 Equities (-1% management fee drag)
    const eqNetReturn = (spRaw / 100) - 0.01;
    equityBal = Math.max(0, equityBal * (1 + eqNetReturn));

    // 2. Dual-Blend FIA Crediting (e.g. 80% S&P / 20% Fixed 3%)
    let spSleeveReturn = 0;
    if (spRaw > 0) {
      spSleeveReturn = Math.min(fiaCap, (spRaw / 100) * fiaParticipation);
    } else {
      spSleeveReturn = fiaFloor;
    }

    const blendedFiaCredit = (fiaIndexedAllocationPct * spSleeveReturn) + (fiaFixedAllocationPct * fiaFixedAllocationRate);
    if (spRaw <= 0) {
      zeroLossCount++;
    }
    fiaBal = Math.max(0, fiaBal * (1 + blendedFiaCredit));

    // 3. Taxable Fixed Benchmark
    fixedBal = Math.max(0, fixedBal * (1 + afterTaxFixedRate));

    // 4. Traditional 60/40 (60% Equities / 40% Selected Bonds)
    const tradBlend = (0.60 * (spRaw / 100)) + (0.40 * (bondRaw / 100));
    trad6040Bal = Math.max(0, trad6040Bal * (1 + tradBlend));

    // 5. Modernized 60/40 (60% Equities / 40% Blended FIA Buffer)
    const modBlend = (0.60 * (spRaw / 100)) + (0.40 * blendedFiaCredit);
    mod6040FiaBal = Math.max(0, mod6040FiaBal * (1 + modBlend));

    results.push({
      year: idx,
      calendarYear: y,
      sp500Return: spRaw,
      selectedBondReturn: bondRaw,
      equityBalance: Math.round(equityBal),
      fiaBalance: Math.round(fiaBal),
      fixedAnnuityBalance: Math.round(fixedBal),
      traditional6040Balance: Math.round(trad6040Bal),
      modernized6040FiaBalance: Math.round(mod6040FiaBal),
      fiaInterestCredited: Number((blendedFiaCredit * 100).toFixed(2)),
      isFloorProtected: spRaw <= 0,
    });
    idx++;
  }

  return {
    results,
    finalEquity: Math.round(equityBal),
    finalFia: Math.round(fiaBal),
    finalFixed: Math.round(fixedBal),
    finalTraditional6040: Math.round(trad6040Bal),
    finalModernized6040Fia: Math.round(mod6040FiaBal),
    zeroLossYearsCount: zeroLossCount,
  };
}