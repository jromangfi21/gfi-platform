export type FilingStatus = 'mfj' | 'single';

export interface StateTaxInfo {
  name: string;
  rate: number;
}

export const STATE_TAX_RATES: Record<string, StateTaxInfo> = {
  AL: { name: 'Alabama', rate: 0.05 },
  AK: { name: 'Alaska', rate: 0.00 },
  AZ: { name: 'Arizona', rate: 0.025 },
  AR: { name: 'Arkansas', rate: 0.044 },
  CA: { name: 'California', rate: 0.093 },
  CO: { name: 'Colorado', rate: 0.044 },
  CT: { name: 'Connecticut', rate: 0.0699 },
  DE: { name: 'Delaware', rate: 0.066 },
  FL: { name: 'Florida', rate: 0.00 },
  GA: { name: 'Georgia', rate: 0.0549 },
  HI: { name: 'Hawaii', rate: 0.0825 },
  ID: { name: 'Idaho', rate: 0.058 },
  IL: { name: 'Illinois', rate: 0.0495 },
  IN: { name: 'Indiana', rate: 0.0305 },
  IA: { name: 'Iowa', rate: 0.057 },
  KS: { name: 'Kansas', rate: 0.057 },
  KY: { name: 'Kentucky', rate: 0.04 },
  LA: { name: 'Louisiana', rate: 0.0425 },
  ME: { name: 'Maine', rate: 0.0715 },
  MD: { name: 'Maryland', rate: 0.0575 },
  MA: { name: 'Massachusetts', rate: 0.05 },
  MI: { name: 'Michigan', rate: 0.0425 },
  MN: { name: 'Minnesota', rate: 0.0785 },
  MS: { name: 'Mississippi', rate: 0.047 },
  MO: { name: 'Missouri', rate: 0.048 },
  MT: { name: 'Montana', rate: 0.059 },
  NE: { name: 'Nebraska', rate: 0.0584 },
  NV: { name: 'Nevada', rate: 0.00 },
  NH: { name: 'New Hampshire', rate: 0.00 },
  NJ: { name: 'New Jersey', rate: 0.0637 },
  NM: { name: 'New Mexico', rate: 0.049 },
  NY: { name: 'New York', rate: 0.0685 },
  NC: { name: 'North Carolina', rate: 0.045 },
  ND: { name: 'North Dakota', rate: 0.0195 },
  OH: { name: 'Ohio', rate: 0.035 },
  OK: { name: 'Oklahoma', rate: 0.0475 },
  OR: { name: 'Oregon', rate: 0.0875 },
  PA: { name: 'Pennsylvania', rate: 0.0307 },
  RI: { name: 'Rhode Island', rate: 0.0599 },
  SC: { name: 'South Carolina', rate: 0.064 },
  SD: { name: 'South Dakota', rate: 0.00 },
  TN: { name: 'Tennessee', rate: 0.00 },
  TX: { name: 'Texas', rate: 0.00 },
  UT: { name: 'Utah', rate: 0.0465 },
  VT: { name: 'Vermont', rate: 0.066 },
  VA: { name: 'Virginia', rate: 0.0575 },
  WA: { name: 'Washington', rate: 0.00 },
  WV: { name: 'West Virginia', rate: 0.0512 },
  WI: { name: 'Wisconsin', rate: 0.053 },
  WY: { name: 'Wyoming', rate: 0.00 },
};

export type FreeWithdrawalSchedule = 'tiered_2_12' | 'standard_10' | 'flat_10';

export interface TaxSimulationParams {
  currentAge: number;
  retirementAge: number;
  endAge: number;
  filingStatus: FilingStatus;
  currentEarnedIncome: number;
  traditionalIra: number;
  rothBalance: number;
  taxableBrokerage: number;
  annualFixedIncome: number;
  annualSocialSecurity: number;
  annualWithdrawalNeed: number;
  expectedReturn: number;
  targetBracketCeiling: number;
  stateCode: string;
  stateTaxRate: number;
  heirsTaxRate: number;
  carrierBonusPct: number;
  freeWithdrawalSchedule?: FreeWithdrawalSchedule;
  freeWithdrawalPct?: number;
}

export interface YearlySimulationResult {
  age: number;
  contractYear: number;
  isWorking: boolean;
  baselineGrossIncome: number;
  baselineIra: number;
  baselineRoth: number;
  baselineTax: number;
  planIra: number;
  planRoth: number;
  planTax: number;
  conversionAmount: number;
  maxFreeWithdrawalRatePct: number;
  isSurrenderExpired: boolean;
  maxFreeWithdrawal: number;
  taxesPaidFromWithdrawal: number;
  statutoryRatePct: number;
  netEffectiveRatePct: number;
  rmdAvoided: number;
}

export interface TaxSimulationOutput {
  yearlyData: YearlySimulationResult[];
  lifetimeTaxSaved: number;
  totalBaselineTax: number;
  totalPlanTax: number;
  totalRmdAvoided: number;
  heirSavings: number;
  upfrontBonusDollars: number;
  grossStatutoryRatePct: number;
  overallNetEffectiveTaxRate: number;
  totalConversionsExecuted: number;
  terminalWealthBase: number;
}

const RMD_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9,
};

// Full Federal Progressive Bracket Tax Computation
export function calculateProgressiveFedTax(taxableIncome: number, filingStatus: FilingStatus): number {
  if (taxableIncome <= 0) return 0;

  const brackets = filingStatus === 'mfj' ? [
    { cap: 24800, rate: 0.10 },
    { cap: 100800, rate: 0.12 },
    { cap: 211400, rate: 0.22 },
    { cap: 403550, rate: 0.24 },
    { cap: 512450, rate: 0.32 },
    { cap: 768700, rate: 0.35 },
    { cap: Infinity, rate: 0.37 },
  ] : [
    { cap: 12400, rate: 0.10 },
    { cap: 50400, rate: 0.12 },
    { cap: 105700, rate: 0.22 },
    { cap: 201775, rate: 0.24 },
    { cap: 256225, rate: 0.32 },
    { cap: 640600, rate: 0.35 },
    { cap: Infinity, rate: 0.37 },
  ];

  let tax = 0;
  let previousCap = 0;

  for (const b of brackets) {
    if (taxableIncome > previousCap) {
      const taxableSlice = Math.min(taxableIncome, b.cap) - previousCap;
      tax += taxableSlice * b.rate;
      previousCap = b.cap;
    } else {
      break;
    }
  }

  return Math.round(tax);
}

export function getMarginalFedRate(taxableIncome: number, filingStatus: FilingStatus): number {
  if (filingStatus === 'mfj') {
    if (taxableIncome > 768700) return 0.37;
    if (taxableIncome > 512450) return 0.35;
    if (taxableIncome > 403550) return 0.32;
    if (taxableIncome > 211400) return 0.24;
    if (taxableIncome > 100800) return 0.22;
    if (taxableIncome > 24800) return 0.12;
    return 0.10;
  } else {
    if (taxableIncome > 640600) return 0.37;
    if (taxableIncome > 256225) return 0.35;
    if (taxableIncome > 201775) return 0.32;
    if (taxableIncome > 105700) return 0.24;
    if (taxableIncome > 50400) return 0.22;
    if (taxableIncome > 12400) return 0.12;
    return 0.10;
  }
}

export function runRobustTaxSimulation(params: TaxSimulationParams): TaxSimulationOutput {
  const {
    currentAge,
    retirementAge,
    endAge = 95,
    filingStatus,
    currentEarnedIncome = 0,
    traditionalIra,
    rothBalance,
    annualFixedIncome,
    annualSocialSecurity,
    annualWithdrawalNeed = 60000,
    expectedReturn,
    targetBracketCeiling,
    stateTaxRate,
    heirsTaxRate,
    carrierBonusPct,
    freeWithdrawalSchedule = 'tiered_2_12',
    freeWithdrawalPct = 0.10,
  } = params;

  const stdDeduction = filingStatus === 'mfj' ? 32200 : 16100;
  const upfrontBonusDollars = Math.round(traditionalIra * carrierBonusPct);

  let baseIra = traditionalIra;
  let baseRoth = rothBalance;

  let planIra = traditionalIra + upfrontBonusDollars;
  let planRoth = rothBalance;

  let totalBaselineTax = 0;
  let totalPlanTax = 0;
  let totalRmdAvoided = 0;
  let totalConversionsExecuted = 0;
  let totalTaxesPaidOnConversions = 0;

  const yearlyData: YearlySimulationResult[] = [];

  for (let age = currentAge; age <= endAge; age++) {
    const contractYear = age - currentAge + 1;
    const isWorking = age < retirementAge;

    // After Year 10 (Year 11+), surrender charges expire -> 100% full liquidity
    let maxFreeWithdrawalRate = 0.10;
    const isSurrenderExpired = contractYear > 10;

    if (isSurrenderExpired) {
      maxFreeWithdrawalRate = 1.00;
    } else if (freeWithdrawalSchedule === 'tiered_2_12') {
      maxFreeWithdrawalRate = contractYear === 1 ? 0.02 : 0.12;
    } else if (freeWithdrawalSchedule === 'standard_10') {
      maxFreeWithdrawalRate = contractYear === 1 ? 0.00 : 0.10;
    } else {
      maxFreeWithdrawalRate = freeWithdrawalPct;
    }

    // 1. Baseline Cash Flow & Taxes (Inaction Path)
    let baselineGross = 0;
    let baseTaxableIncome = 0;
    let baselineYearTax = 0;

    if (isWorking) {
      // Pre-retirement: tax liability matches active employment salary
      baselineGross = currentEarnedIncome;
      baseTaxableIncome = Math.max(0, baselineGross - stdDeduction);
      const fedTax = calculateProgressiveFedTax(baseTaxableIncome, filingStatus);
      const stateTax = Math.round(baseTaxableIncome * stateTaxRate);
      baselineYearTax = fedTax + stateTax;
    } else {
      // Post-retirement: tax liability matches desired spending need, pensions, SS, & RMDs
      let distributionTaken = annualWithdrawalNeed;
      if (age >= 73) {
        const divisor = RMD_DIVISORS[age] || 8.0;
        const rmd = baseIra / divisor;
        distributionTaken = Math.max(rmd, annualWithdrawalNeed);
        baseIra = Math.max(0, baseIra - distributionTaken);
      } else {
        baseIra = Math.max(0, baseIra - distributionTaken);
      }

      baselineGross = distributionTaken + annualFixedIncome + (annualSocialSecurity * 0.85);
      baseTaxableIncome = Math.max(0, baselineGross - stdDeduction);
      const fedTax = calculateProgressiveFedTax(baseTaxableIncome, filingStatus);
      const stateTax = Math.round(baseTaxableIncome * stateTaxRate);
      baselineYearTax = fedTax + stateTax;
    }

    totalBaselineTax += baselineYearTax;
    baseIra = Math.round(baseIra * (1 + expectedReturn));

    // 2. Strategic Plan: Conversions until Plan IRA reaches $0
    let conversionAmount = 0;
    let maxFreeDollars = Math.round(planIra * maxFreeWithdrawalRate);
    let taxesPaidFromWithdrawal = 0;
    let planYearTax = 0;
    let statRatePct = 0;
    let netRatePct = 0;

    // Current fixed non-conversion taxable income
    const fixedTaxableBase = isWorking
      ? Math.max(0, currentEarnedIncome - stdDeduction)
      : Math.max(0, (annualFixedIncome + (annualSocialSecurity * 0.85)) - stdDeduction);

    if (planIra > 0) {
      // Remaining room up to target ceiling
      const availableCapacity = Math.max(0, targetBracketCeiling - fixedTaxableBase);

      const marginalFed = getMarginalFedRate(fixedTaxableBase + Math.min(availableCapacity, 50000), filingStatus);
      const combinedRate = marginalFed + stateTaxRate;
      statRatePct = Number((combinedRate * 100).toFixed(1));

      // Conversion amount bounded by available bracket room AND free withdrawal liquidity
      const maxConversionPossible = Math.round(maxFreeDollars / combinedRate);
      conversionAmount = Math.min(planIra, Math.min(availableCapacity, maxConversionPossible));

      if (conversionAmount > 0) {
        // Compute exact incremental tax triggered by conversion
        const baseFed = calculateProgressiveFedTax(fixedTaxableBase, filingStatus);
        const totalFed = calculateProgressiveFedTax(fixedTaxableBase + conversionAmount, filingStatus);
        const conversionFedTax = totalFed - baseFed;
        const conversionStateTax = Math.round(conversionAmount * stateTaxRate);

        taxesPaidFromWithdrawal = conversionFedTax + conversionStateTax;
        planYearTax = baselineYearTax + taxesPaidFromWithdrawal;

        const effectiveConversionRate = taxesPaidFromWithdrawal / conversionAmount;
        const netCostFactor = Math.max(0.01, effectiveConversionRate - carrierBonusPct);
        netRatePct = Number((netCostFactor * 100).toFixed(1));

        planIra = Math.max(0, planIra - conversionAmount - taxesPaidFromWithdrawal);
        planRoth += conversionAmount;

        totalConversionsExecuted += conversionAmount;
        totalTaxesPaidOnConversions += taxesPaidFromWithdrawal;
      } else {
        planYearTax = isWorking 
          ? baselineYearTax 
          : calculateProgressiveFedTax(fixedTaxableBase, filingStatus) + Math.round(fixedTaxableBase * stateTaxRate);
      }
    } else {
      // 100% Tax-Free Roth distributions during retirement
      if (!isWorking) {
        planRoth = Math.max(0, planRoth - annualWithdrawalNeed);
        const fedTax = calculateProgressiveFedTax(fixedTaxableBase, filingStatus);
        const stateTax = Math.round(fixedTaxableBase * stateTaxRate);
        planYearTax = fedTax + stateTax;
      } else {
        planYearTax = baselineYearTax;
      }
    }

    if (age >= 73) {
      const divisor = RMD_DIVISORS[age] || 8.0;
      const avoidedRmd = planIra > 0 ? (baseIra - planIra) / divisor : baseIra / divisor;
      totalRmdAvoided += Math.max(0, Math.round(avoidedRmd));
    }

    totalPlanTax += planYearTax;
    planIra = Math.round(planIra * (1 + expectedReturn));
    planRoth = Math.round(planRoth * (1 + expectedReturn));

    yearlyData.push({
      age,
      contractYear,
      isWorking,
      baselineGrossIncome: baselineGross,
      baselineIra: Math.round(baseIra),
      baselineRoth: Math.round(baseRoth),
      baselineTax: baselineYearTax,
      planIra: Math.round(planIra),
      planRoth: Math.round(planRoth),
      planTax: planYearTax,
      conversionAmount,
      maxFreeWithdrawalRatePct: Number((maxFreeWithdrawalRate * 100).toFixed(0)),
      isSurrenderExpired,
      maxFreeWithdrawal: maxFreeDollars,
      taxesPaidFromWithdrawal,
      statutoryRatePct: statRatePct || Number(((0.24 + stateTaxRate) * 100).toFixed(1)),
      netEffectiveRatePct: netRatePct || Number((Math.max(0.01, 0.24 + stateTaxRate - carrierBonusPct) * 100).toFixed(1)),
      rmdAvoided: age >= 73 ? Math.round(baseIra / (RMD_DIVISORS[age] || 8)) : 0,
    });
  }

  const lifetimeTaxSaved = Math.max(0, totalBaselineTax - totalPlanTax);
  const heirSavings = Math.round((baseIra * heirsTaxRate));
  const avgStatutoryRate = totalConversionsExecuted > 0 
    ? Number(((totalTaxesPaidOnConversions / totalConversionsExecuted) * 100).toFixed(1))
    : Number(((0.24 + stateTaxRate) * 100).toFixed(1));
  const overallNetEffectiveTaxRate = Number((Math.max(0.01, (avgStatutoryRate / 100) - carrierBonusPct) * 100).toFixed(1));

  return {
    yearlyData,
    lifetimeTaxSaved,
    totalBaselineTax,
    totalPlanTax,
    totalRmdAvoided,
    heirSavings,
    upfrontBonusDollars,
    grossStatutoryRatePct: avgStatutoryRate,
    overallNetEffectiveTaxRate,
    totalConversionsExecuted,
    terminalWealthBase: baseIra,
  };
}