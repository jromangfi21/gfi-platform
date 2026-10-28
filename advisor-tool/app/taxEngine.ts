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
  freeWithdrawalSchedule?: FreeWithdrawalSchedule;
  freeWithdrawalPct?: number;
}

export interface YearlySimulationResult {
  age: number;
  contractYear: number;
  baselineIra: number;
  baselineRoth: number;
  baselineTax: number;
  planIra: number;
  planRoth: number;
  planTax: number;
  conversionAmount: number;
  maxFreeWithdrawalRatePct: number;
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

// IRS Uniform Lifetime Table (abbreviated age 73 to 95)
const RMD_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9,
};

export function runRobustTaxSimulation(params: TaxSimulationParams): TaxSimulationOutput {
  const {
    currentAge,
    retirementAge,
    endAge = 95,
    filingStatus,
    traditionalIra,
    rothBalance,
    annualFixedIncome,
    annualSocialSecurity,
    expectedReturn,
    targetBracketCeiling,
    stateTaxRate,
    heirsTaxRate,
    carrierBonusPct,
    freeWithdrawalSchedule = 'tiered_2_12',
    freeWithdrawalPct = 0.10,
  } = params;

  const stdDeduction = filingStatus === 'mfj' ? 29200 : 14600;
  const upfrontBonusDollars = Math.round(traditionalIra * carrierBonusPct);

  // Baseline tracking (Inaction / No conversion)
  let baseIra = traditionalIra;
  let baseRoth = rothBalance;

  // Plan tracking (Active tactical conversion)
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

    // Determine contractual free withdrawal rate for current contract year
    let maxFreeWithdrawalRate = 0.10;
    if (freeWithdrawalSchedule === 'tiered_2_12') {
      maxFreeWithdrawalRate = contractYear === 1 ? 0.02 : contractYear <= 10 ? 0.12 : 0.10;
    } else if (freeWithdrawalSchedule === 'standard_10') {
      maxFreeWithdrawalRate = contractYear === 1 ? 0.00 : 0.10;
    } else {
      maxFreeWithdrawalRate = freeWithdrawalPct;
    }

    // Baseline RMDs & Living Withdrawals
    let baseTaxableIncome = annualFixedIncome + (annualSocialSecurity * 0.85);
    let baselineYearTax = 0;

    if (age >= retirementAge) {
      if (age >= 73) {
        const divisor = RMD_DIVISORS[age] || 8.0;
        const rmd = baseIra / divisor;
        baseTaxableIncome += rmd;
        baseIra = Math.max(0, baseIra - rmd);
      } else {
        const need = 40000;
        baseTaxableIncome += need;
        baseIra = Math.max(0, baseIra - need);
      }

      const taxableBase = Math.max(0, baseTaxableIncome - stdDeduction);
      const fedRate = taxableBase > 100000 ? 0.22 : 0.12;
      baselineYearTax = Math.round(taxableBase * (fedRate + stateTaxRate));
    }
    totalBaselineTax += baselineYearTax;
    baseIra = Math.round(baseIra * (1 + expectedReturn));

    // Optimized Plan: Conversions before Age 73
    let conversionAmount = 0;
    let maxFreeDollars = Math.round(planIra * maxFreeWithdrawalRate);
    let taxesPaidFromWithdrawal = 0;
    let planYearTax = 0;
    let statRatePct = 0;
    let netRatePct = 0;

    if (age < 73 && planIra > 0) {
      const fixedBase = Math.max(0, (annualFixedIncome + (annualSocialSecurity * 0.85)) - stdDeduction);
      const capacity = Math.max(0, targetBracketCeiling - fixedBase);

      const combinedStatRate = (capacity > 100000 ? 0.22 : 0.12) + stateTaxRate;
      statRatePct = Number((combinedStatRate * 100).toFixed(1));

      // Available penalty-free buffer bounds the maximum conversion tax liability
      const maxConversionPossible = Math.round(maxFreeDollars / combinedStatRate);
      conversionAmount = Math.min(planIra, Math.min(capacity, maxConversionPossible));

      if (conversionAmount > 0) {
        taxesPaidFromWithdrawal = Math.round(conversionAmount * combinedStatRate);
        planYearTax = taxesPaidFromWithdrawal;

        // Net effective rate reflects carrier upfront bonus offset
        const netCostFactor = Math.max(0.01, combinedStatRate - carrierBonusPct);
        netRatePct = Number((netCostFactor * 100).toFixed(1));

        planIra = Math.max(0, planIra - conversionAmount - taxesPaidFromWithdrawal);
        planRoth += conversionAmount;

        totalConversionsExecuted += conversionAmount;
        totalTaxesPaidOnConversions += taxesPaidFromWithdrawal;
      }
    } else if (age >= 73) {
      // In plan, pre-tax balance was converted; compulsory RMD is avoided
      const divisor = RMD_DIVISORS[age] || 8.0;
      const avoidedRmd = planIra > 0 ? (baseIra - planIra) / divisor : baseIra / divisor;
      totalRmdAvoided += Math.max(0, Math.round(avoidedRmd));

      // Post-73 plan taxes (Roth distributions are 100% tax-free)
      const nonTaxableRothWithdrawal = 40000;
      planRoth = Math.max(0, planRoth - nonTaxableRothWithdrawal);

      const fixedTaxable = Math.max(0, (annualFixedIncome + (annualSocialSecurity * 0.85)) - stdDeduction);
      planYearTax = Math.round(fixedTaxable * stateTaxRate);
    }

    totalPlanTax += planYearTax;
    planIra = Math.round(planIra * (1 + expectedReturn));
    planRoth = Math.round(planRoth * (1 + expectedReturn));

    yearlyData.push({
      age,
      contractYear,
      baselineIra: Math.round(baseIra),
      baselineRoth: Math.round(baseRoth),
      baselineTax: baselineYearTax,
      planIra: Math.round(planIra),
      planRoth: Math.round(planRoth),
      planTax: planYearTax,
      conversionAmount,
      maxFreeWithdrawalRatePct: Number((maxFreeWithdrawalRate * 100).toFixed(0)),
      maxFreeWithdrawal: maxFreeDollars,
      taxesPaidFromWithdrawal,
      statutoryRatePct: statRatePct || Number(((0.22 + stateTaxRate) * 100).toFixed(1)),
      netEffectiveRatePct: netRatePct || Number((Math.max(0.01, 0.22 + stateTaxRate - carrierBonusPct) * 100).toFixed(1)),
      rmdAvoided: age >= 73 ? Math.round(baseIra / (RMD_DIVISORS[age] || 8)) : 0,
    });
  }

  const lifetimeTaxSaved = Math.max(0, totalBaselineTax - totalPlanTax);
  const heirSavings = Math.round((baseIra * heirsTaxRate));
  const grossStatutoryRatePct = Number(((0.22 + stateTaxRate) * 100).toFixed(1));
  const overallNetEffectiveTaxRate = Number((Math.max(0.01, (0.22 + stateTaxRate) - carrierBonusPct) * 100).toFixed(1));

  return {
    yearlyData,
    lifetimeTaxSaved,
    totalBaselineTax,
    totalPlanTax,
    totalRmdAvoided,
    heirSavings,
    upfrontBonusDollars,
    grossStatutoryRatePct,
    overallNetEffectiveTaxRate,
    totalConversionsExecuted,
    terminalWealthBase: baseIra,
  };
}