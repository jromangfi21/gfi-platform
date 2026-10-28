// app/bufferEngine.ts

export type BacktestPeriod = '2000_2010' | '2008_2018' | '2015_2025' | 'all_25_years';

export interface BacktestYearData {
  year: number;
  calendarYear: number;
  sp500Return: number;
  equityBalance: number;
  fiaBalance: number;
  fixedAnnuityBalance: number;
  fiaCreditedRate: number;
}

export interface AdvancedBufferInputs {
  initialDeposit: number;
  annualWithdrawal: number;
  period: BacktestPeriod;
  fiaCap: number;            // e.g. 0.095 (9.5%)
  fiaFloor: number;          // e.g. 0.0 (0%)
  fiaParticipation: number;  // e.g. 1.0 (100%)
  fixedRate: number;         // e.g. 0.0475 (4.75% MYGA/CD)
  taxRateOnFixed: number;    // e.g. 0.24 (ordinary income tax on annual fixed growth)
}

// Historical S&P 500 Total Returns (2000 through 2024)
const HISTORICAL_SP500: { year: number; return: number }[] = [
  { year: 2000, return: -0.091 },
  { year: 2001, return: -0.119 },
  { year: 2002, return: -0.221 },
  { year: 2003, return: 0.287 },
  { year: 2004, return: 0.109 },
  { year: 2005, return: 0.049 },
  { year: 2006, return: 0.158 },
  { year: 2007, return: 0.055 },
  { year: 2008, return: -0.370 },
  { year: 2009, return: 0.265 },
  { year: 2010, return: 0.151 },
  { year: 2011, return: 0.021 },
  { year: 2012, return: 0.160 },
  { year: 2013, return: 0.324 },
  { year: 2014, return: 0.137 },
  { year: 2015, return: 0.014 },
  { year: 2016, return: 0.120 },
  { year: 2017, return: 0.218 },
  { year: 2018, return: -0.044 },
  { year: 2019, return: 0.315 },
  { year: 2020, return: 0.184 },
  { year: 2021, return: 0.287 },
  { year: 2022, return: -0.181 },
  { year: 2023, return: 0.263 },
  { year: 2024, return: 0.240 },
];

export function runWealthLogixBacktest(inputs: AdvancedBufferInputs) {
  let filteredHistory = [...HISTORICAL_SP500];

  if (inputs.period === '2000_2010') {
    filteredHistory = HISTORICAL_SP500.filter(d => d.year >= 2000 && d.year <= 2010);
  } else if (inputs.period === '2008_2018') {
    filteredHistory = HISTORICAL_SP500.filter(d => d.year >= 2008 && d.year <= 2018);
  } else if (inputs.period === '2015_2025') {
    filteredHistory = HISTORICAL_SP500.filter(d => d.year >= 2015 && d.year <= 2024);
  }

  const results: BacktestYearData[] = [];
  let equityBal = inputs.initialDeposit;
  let fiaBal = inputs.initialDeposit;
  let fixedBal = inputs.initialDeposit;

  // After-tax yield on fixed annuity / taxable bond CD
  const netFixedReturn = inputs.fixedRate * (1 - inputs.taxRateOnFixed);

  for (let i = 0; i < filteredHistory.length; i++) {
    const item = filteredHistory[i];
    const spReturn = item.return;

    // 1. Equities (S&P 500 direct index, fee drag 1.0%, subject to full drawdowns)
    equityBal = Math.max(0, equityBal - inputs.annualWithdrawal);
    equityBal = Math.max(0, equityBal * (1 + (spReturn - 0.01)));

    // 2. Fixed Indexed Annuity (FIA Crediting formula: Floor, Cap, Par)
    fiaBal = Math.max(0, fiaBal - inputs.annualWithdrawal);
    let creditedRate = Math.min(inputs.fiaCap, Math.max(inputs.fiaFloor, spReturn * inputs.fiaParticipation));
    fiaBal = fiaBal * (1 + creditedRate);

    // 3. Fixed Annuity (MYGA/CD: Steady rate minus annual tax drag)
    fixedBal = Math.max(0, fixedBal - inputs.annualWithdrawal);
    fixedBal = fixedBal * (1 + netFixedReturn);

    results.push({
      year: i + 1,
      calendarYear: item.year,
      sp500Return: Math.round(spReturn * 100),
      equityBalance: Math.round(equityBal),
      fiaBalance: Math.round(fiaBal),
      fixedAnnuityBalance: Math.round(fixedBal),
      fiaCreditedRate: Math.round(creditedRate * 100 * 10) / 10,
    });
  }

  const finalEquity = Math.round(equityBal);
  const finalFia = Math.round(fiaBal);
  const finalFixed = Math.round(fixedBal);

  return {
    results,
    finalEquity,
    finalFia,
    finalFixed,
    fiaVsEquityAdvantage: finalFia - finalEquity,
    fiaVsFixedAdvantage: finalFia - finalFixed,
    zeroLossYearsCount: results.filter(r => r.fiaCreditedRate === 0).length,
  };
}