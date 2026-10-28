// app/taxEngine.ts

export type FilingStatus = 'mfj' | 'single';

export const STATE_TAX_RATES: { [stateCode: string]: { name: string; rate: number } } = {
  AL: { name: 'Alabama', rate: 0.05 },
  AK: { name: 'Alaska', rate: 0.00 },
  AZ: { name: 'Arizona', rate: 0.025 },
  AR: { name: 'Arkansas', rate: 0.039 },
  CA: { name: 'California', rate: 0.093 },
  CO: { name: 'Colorado', rate: 0.044 },
  CT: { name: 'Connecticut', rate: 0.055 },
  DE: { name: 'Delaware', rate: 0.066 },
  DC: { name: 'District of Columbia', rate: 0.085 },
  FL: { name: 'Florida', rate: 0.00 },
  GA: { name: 'Georgia', rate: 0.0519 },
  HI: { name: 'Hawaii', rate: 0.076 },
  ID: { name: 'Idaho', rate: 0.053 },
  IL: { name: 'Illinois', rate: 0.0495 },
  IN: { name: 'Indiana', rate: 0.030 },
  IA: { name: 'Iowa', rate: 0.038 },
  KS: { name: 'Kansas', rate: 0.0558 },
  KY: { name: 'Kentucky', rate: 0.040 },
  LA: { name: 'Louisiana', rate: 0.030 },
  ME: { name: 'Maine', rate: 0.0675 },
  MD: { name: 'Maryland', rate: 0.0475 },
  MA: { name: 'Massachusetts', rate: 0.050 },
  MI: { name: 'Michigan', rate: 0.0425 },
  MN: { name: 'Minnesota', rate: 0.068 },
  MS: { name: 'Mississippi', rate: 0.040 },
  MO: { name: 'Missouri', rate: 0.047 },
  MT: { name: 'Montana', rate: 0.059 },
  NE: { name: 'Nebraska', rate: 0.052 },
  NV: { name: 'Nevada', rate: 0.00 },
  NH: { name: 'New Hampshire', rate: 0.00 },
  NJ: { name: 'New Jersey', rate: 0.0637 },
  NM: { name: 'New Mexico', rate: 0.049 },
  NY: { name: 'New York', rate: 0.065 },
  NC: { name: 'North Carolina', rate: 0.0425 },
  ND: { name: 'North Dakota', rate: 0.025 },
  OH: { name: 'Ohio', rate: 0.03125 },
  OK: { name: 'Oklahoma', rate: 0.0475 },
  OR: { name: 'Oregon', rate: 0.0875 },
  PA: { name: 'Pennsylvania', rate: 0.0307 },
  RI: { name: 'Rhode Island', rate: 0.0475 },
  SC: { name: 'South Carolina', rate: 0.060 },
  SD: { name: 'South Dakota', rate: 0.00 },
  TN: { name: 'Tennessee', rate: 0.00 },
  TX: { name: 'Texas', rate: 0.00 },
  UT: { name: 'Utah', rate: 0.045 },
  VT: { name: 'Vermont', rate: 0.066 },
  VA: { name: 'Virginia', rate: 0.0575 },
  WA: { name: 'Washington', rate: 0.00 },
  WV: { name: 'West Virginia', rate: 0.0482 },
  WI: { name: 'Wisconsin', rate: 0.053 },
  WY: { name: 'Wyoming', rate: 0.00 },
};

export interface TaxEngineInputs {
  currentAge: number;
  retirementAge: number;
  endAge: number;
  filingStatus: FilingStatus;
  traditionalIra: number;
  rothBalance: number;
  taxableBrokerage: number;
  annualFixedIncome: number;
  annualSocialSecurity: number;
  expectedReturn: number;
  targetBracketCeiling: number;
  stateCode: string;
  stateTaxRate: number;
  heirsTaxRate: number;
  carrierBonusPct: number;
  freeWithdrawalPct: number;
}

export interface YearlyTaxData {
  age: number;
  baselineIra: number;
  baselineRoth: number;
  planIra: number;
  planRoth: number;
  baselineTax: number;
  planTax: number;
  rmdAmount: number;
  conversionAmount: number;
  maxFreeWithdrawal: number;
  taxesPaidFromWithdrawal: number;
  statutoryRatePct: number;
  netEffectiveRatePct: number;
}

const BRACKETS_2026_MFJ = [
  { cap: 23200, rate: 0.10 },
  { cap: 94300, rate: 0.12 },
  { cap: 201050, rate: 0.22 },
  { cap: 383900, rate: 0.24 },
  { cap: 487450, rate: 0.32 },
  { cap: 731200, rate: 0.35 },
  { cap: Infinity, rate: 0.37 },
];

const BRACKETS_2026_SINGLE = [
  { cap: 11600, rate: 0.10 },
  { cap: 47150, rate: 0.12 },
  { cap: 100525, rate: 0.22 },
  { cap: 191950, rate: 0.24 },
  { cap: 243725, rate: 0.32 },
  { cap: 609350, rate: 0.35 },
  { cap: Infinity, rate: 0.37 },
];

const RMD_DIVISORS: { [age: number]: number } = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9,
};

function calculateFederalTax(income: number, status: FilingStatus): number {
  if (income <= 0) return 0;
  const brackets = status === 'mfj' ? BRACKETS_2026_MFJ : BRACKETS_2026_SINGLE;
  let tax = 0;
  let prevCap = 0;

  for (const b of brackets) {
    if (income > b.cap) {
      tax += (b.cap - prevCap) * b.rate;
      prevCap = b.cap;
    } else {
      tax += (income - prevCap) * b.rate;
      break;
    }
  }
  return Math.round(tax);
}

export function runRobustTaxSimulation(inputs: TaxEngineInputs) {
  const yearlyData: YearlyTaxData[] = [];

  let baseIra = inputs.traditionalIra;
  let baseRoth = inputs.rothBalance;

  const upfrontBonusDollars = Math.round(inputs.traditionalIra * inputs.carrierBonusPct);
  let planIra = inputs.traditionalIra + upfrontBonusDollars;
  let planRoth = inputs.rothBalance;

  let totalBaselineTax = 0;
  let totalPlanTax = 0;
  let totalRmdAvoided = 0;
  let totalConversionsExecuted = 0;
  let totalConversionTaxDollars = 0;

  const stdDeduction = inputs.filingStatus === 'mfj' ? 29200 : 14600;

  for (let age = inputs.currentAge; age <= inputs.endAge; age++) {
    const isRetired = age >= inputs.retirementAge;
    const isRmdAge = age >= 73;

    // --- 1. BASELINE SCENARIO (INACTION) ---
    let rmd = 0;
    if (isRmdAge && baseIra > 0) {
      const divisor = RMD_DIVISORS[age] || 8.0;
      rmd = Math.round(baseIra / divisor);
    }

    let baselineRetirementWithdrawal = 0;
    if (isRetired && !isRmdAge && baseIra > 0) {
      const fixedIncomeAvailable = inputs.annualFixedIncome + (age >= 62 ? inputs.annualSocialSecurity : 0);
      baselineRetirementWithdrawal = Math.max(0, inputs.annualFixedIncome + 60000 - fixedIncomeAvailable);
      baselineRetirementWithdrawal = Math.min(baseIra, baselineRetirementWithdrawal);
    }

    const totalTaxableIraDistribution = isRmdAge ? rmd : baselineRetirementWithdrawal;

    let ssTaxable = 0;
    if (isRetired && age >= 62) {
      const provisionalIncome = inputs.annualFixedIncome + totalTaxableIraDistribution + (inputs.annualSocialSecurity * 0.5);
      const ssThreshold = inputs.filingStatus === 'mfj' ? 44000 : 34000;
      ssTaxable = provisionalIncome > ssThreshold ? inputs.annualSocialSecurity * 0.85 : inputs.annualSocialSecurity * 0.50;
    }

    const baselineAGI = inputs.annualFixedIncome + totalTaxableIraDistribution + ssTaxable;
    const baselineTaxableIncome = Math.max(0, baselineAGI - stdDeduction);
    const baselineFedTax = calculateFederalTax(baselineTaxableIncome, inputs.filingStatus);
    const baselineStateTax = Math.round(baselineTaxableIncome * inputs.stateTaxRate);
    const yearlyBaselineTax = baselineFedTax + baselineStateTax;

    totalBaselineTax += yearlyBaselineTax;

    baseIra = Math.max(0, (baseIra - totalTaxableIraDistribution) * (1 + inputs.expectedReturn));
    baseRoth = baseRoth * (1 + inputs.expectedReturn);

    // --- 2. OPTIMIZED ROTH BLUEPRINT (WITH STATE TAX & FREE WITHDRAWAL CAP) ---
    let conversion = 0;
    let maxFreeWithdrawal = 0;
    let taxesPaidFromWithdrawal = 0;
    let statutoryRatePct = 0;
    let netEffectiveRatePct = 0;

    if (age >= inputs.currentAge && age < 73 && planIra > 0) {
      maxFreeWithdrawal = Math.round(planIra * inputs.freeWithdrawalPct);

      const plannedOtherIncome = inputs.annualFixedIncome + (isRetired && age >= 62 ? inputs.annualSocialSecurity * 0.85 : 0);
      const bracketHeadroom = Math.max(0, inputs.targetBracketCeiling - Math.max(0, plannedOtherIncome - stdDeduction));

      const fedMarginal = inputs.targetBracketCeiling > 201050 ? 0.24 : 0.22;
      const marginalRate = fedMarginal + inputs.stateTaxRate;
      statutoryRatePct = Math.round(marginalRate * 1000) / 10;
      netEffectiveRatePct = Math.max(0, Math.round((marginalRate - inputs.carrierBonusPct) * 1000) / 10);

      const maxConversionCoveredByFreeWithdrawal = marginalRate > 0 ? Math.round(maxFreeWithdrawal / marginalRate) : bracketHeadroom;

      conversion = Math.min(planIra, bracketHeadroom, maxConversionCoveredByFreeWithdrawal);
      totalConversionsExecuted += conversion;
    }

    let planRmd = 0;
    if (isRmdAge && planIra > 0) {
      const divisor = RMD_DIVISORS[age] || 8.0;
      planRmd = Math.round(planIra / divisor);
    }

    totalRmdAvoided += Math.max(0, rmd - planRmd);

    const planAGI = inputs.annualFixedIncome + planRmd + conversion + (isRetired && age >= 62 ? inputs.annualSocialSecurity * 0.85 : 0);
    const planTaxableIncome = Math.max(0, planAGI - stdDeduction);
    const planFedTax = calculateFederalTax(planTaxableIncome, inputs.filingStatus);
    const planStateTax = Math.round(planTaxableIncome * inputs.stateTaxRate);
    const yearlyPlanTax = planFedTax + planStateTax;

    if (conversion > 0) {
      const marginalTaxAttributableToConversion = Math.round(conversion * ((inputs.targetBracketCeiling > 201050 ? 0.24 : 0.22) + inputs.stateTaxRate));
      totalConversionTaxDollars += marginalTaxAttributableToConversion;
    }

    totalPlanTax += yearlyPlanTax;
    taxesPaidFromWithdrawal = Math.min(maxFreeWithdrawal, yearlyPlanTax);

    const iraReduction = conversion + planRmd + (age < 73 ? taxesPaidFromWithdrawal : 0);
    planIra = Math.max(0, (planIra - iraReduction) * (1 + inputs.expectedReturn));
    planRoth = (planRoth + conversion) * (1 + inputs.expectedReturn);

    yearlyData.push({
      age,
      baselineIra: Math.round(baseIra),
      baselineRoth: Math.round(baseRoth),
      planIra: Math.round(planIra),
      planRoth: Math.round(planRoth),
      baselineTax: yearlyBaselineTax,
      planTax: yearlyPlanTax,
      rmdAmount: rmd,
      conversionAmount: conversion,
      maxFreeWithdrawal,
      taxesPaidFromWithdrawal,
      statutoryRatePct: conversion > 0 ? statutoryRatePct : 0,
      netEffectiveRatePct: conversion > 0 ? netEffectiveRatePct : 0,
    });
  }

  const lifetimeTaxSaved = Math.max(0, totalBaselineTax - totalPlanTax);
  const heirSavings = Math.round(baseIra * inputs.heirsTaxRate);

  const grossStatutoryRate = (inputs.targetBracketCeiling > 201050 ? 0.24 : 0.22) + inputs.stateTaxRate;
  const netTaxesPaidAfterBonus = Math.max(0, totalConversionTaxDollars - upfrontBonusDollars);
  const overallNetEffectiveTaxRate = totalConversionsExecuted > 0
    ? Math.max(0, Math.round((netTaxesPaidAfterBonus / totalConversionsExecuted) * 1000) / 10)
    : Math.max(0, Math.round((grossStatutoryRate - inputs.carrierBonusPct) * 1000) / 10);

  return {
    yearlyData,
    totalBaselineTax,
    totalPlanTax,
    lifetimeTaxSaved,
    heirSavings,
    totalRmdAvoided,
    upfrontBonusDollars,
    totalConversionsExecuted,
    totalConversionTaxDollars,
    netTaxesPaidAfterBonus,
    grossStatutoryRatePct: Math.round(grossStatutoryRate * 1000) / 10,
    overallNetEffectiveTaxRate,
    terminalWealthBase: Math.round(baseIra + baseRoth),
    terminalWealthPlan: Math.round(planIra + planRoth),
  };
}