export type BacktestPeriod = '2000_2010' | '2008_2018' | '2015_2025' | 'all_25_years';

export interface BacktestYearData {
  year: number;
  calendarYear: number;
  sp500Return: number;
  bondReturn: number;
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
  fiaCap: number;
  fiaFloor: number;
  fiaParticipation: number;
  fixedRate: number;
  taxRateOnFixed: number;
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

// Historical Benchmark Annual Returns (S&P 500 Price Return & US Aggregate Bond Index)
const HISTORICAL_DATA: Record<number, { sp500: number; bond: number }> = {
  2000: { sp500: -9.10, bond: 11.63 },
  2001: { sp500: -11.89, bond: 8.44 },
  2002: { sp500: -22.10, bond: 10.26 },
  2003: { sp500: 28.68, bond: 4.10 },
  2004: { sp500: 10.88, bond: 4.34 },
  2005: { sp500: 4.91, bond: 2.43 },
  2006: { sp500: 15.79, bond: 4.33 },
  2007: { sp500: 5.49, bond: 6.97 },
  2008: { sp500: -37.00, bond: 5.24 },
  2009: { sp500: 26.46, bond: 5.93 },
  2010: { sp500: 15.06, bond: 6.54 },
  2011: { sp500: 2.11, bond: 7.84 },
  2012: { sp500: 16.00, bond: 4.22 },
  2013: { sp500: 32.39, bond: -2.02 },
  2014: { sp500: 13.69, bond: 5.97 },
  2015: { sp500: 1.38, bond: 0.55 },
  2016: { sp500: 11.96, bond: 2.65 },
  2017: { sp500: 21.83, bond: 3.54 },
  2018: { sp500: -4.38, bond: 0.01 },
  2019: { sp500: 31.49, bond: 8.72 },
  2020: { sp500: 18.40, bond: 7.51 },
  2021: { sp500: 28.71, bond: -1.54 },
  2022: { sp500: -18.11, bond: -13.01 }, // Historic dual crash
  2023: { sp500: 26.29, bond: 5.53 },
  2024: { sp500: 25.02, bond: 1.25 },
};

export function runWealthLogixBacktest(params: WealthLogixBacktestParams): WealthLogixBacktestOutput {
  const {
    initialDeposit,
    annualWithdrawal,
    period,
    fiaCap,
    fiaFloor = 0.0,
    fiaParticipation = 1.0,
    fixedRate,
    taxRateOnFixed = 0.24,
  } = params;

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
    const market = HISTORICAL_DATA[y] || { sp500: 6.5, bond: 3.5 };
    const spRaw = market.sp500;
    const bondRaw = market.bond;

    // Apply annual living withdrawal first
    equityBal = Math.max(0, equityBal - annualWithdrawal);
    fiaBal = Math.max(0, fiaBal - annualWithdrawal);
    fixedBal = Math.max(0, fixedBal - annualWithdrawal);
    trad6040Bal = Math.max(0, trad6040Bal - annualWithdrawal);
    mod6040FiaBal = Math.max(0, mod6040FiaBal - annualWithdrawal);

    // 1. Equities (-1% management fee drag)
    const eqNetReturn = (spRaw / 100) - 0.01;
    equityBal = Math.max(0, equityBal * (1 + eqNetReturn));

    // 2. Pure FIA Accumulation (0% Floor / Cap)
    let fiaCredited = 0;
    if (spRaw > 0) {
      fiaCredited = Math.min(fiaCap, (spRaw / 100) * fiaParticipation);
    } else {
      fiaCredited = fiaFloor;
      zeroLossCount++;
    }
    fiaBal = Math.max(0, fiaBal * (1 + fiaCredited));

    // 3. Taxable Fixed Benchmark
    fixedBal = Math.max(0, fixedBal * (1 + afterTaxFixedRate));

    // 4. Traditional 60/40 (60% S&P 500 / 40% Barclays Aggregate Bonds)
    const tradBlend = (0.60 * (spRaw / 100)) + (0.40 * (bondRaw / 100));
    trad6040Bal = Math.max(0, trad6040Bal * (1 + tradBlend));

    // 5. Modernized 60/40 (60% S&P 500 / 40% FIA Bond Replacement with 0% Floor)
    const modBlend = (0.60 * (spRaw / 100)) + (0.40 * fiaCredited);
    mod6040FiaBal = Math.max(0, mod6040FiaBal * (1 + modBlend));

    results.push({
      year: idx,
      calendarYear: y,
      sp500Return: spRaw,
      bondReturn: bondRaw,
      equityBalance: Math.round(equityBal),
      fiaBalance: Math.round(fiaBal),
      fixedAnnuityBalance: Math.round(fixedBal),
      traditional6040Balance: Math.round(trad6040Bal),
      modernized6040FiaBalance: Math.round(mod6040FiaBal),
      fiaInterestCredited: Number((fiaCredited * 100).toFixed(2)),
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