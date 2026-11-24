export type FilingStatus = 'mfj' | 'single';
export type FreeWithdrawalSchedule = 'tiered_2_12' | 'standard_10' | 'flat_10';

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
  NY: { name: 'New York', rate: 0.065 },
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

// IRS Uniform Lifetime Table RMD Factors
const UNIFORM_LIFETIME_TABLE: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5,  95: 8.9,
};

export interface TaxSimulationParams {
  currentAge: number;
  retirementAge: number;
  endAge?: number;
  filingStatus: FilingStatus;
  currentEarnedIncome: number;
  traditionalIra: number;
  rothBalance: number;
  taxableBrokerage?: number;
  annualFixedIncome: number;
  annualSocialSecurity: number;
  annualWithdrawalNeed: number;
  expectedReturn?: number;
  targetBracketCeiling: number;
  stateCode: string;
  stateTaxRate: number;
  heirsTaxRate: number;
  carrierBonusPct: number;
  freeWithdrawalSchedule: FreeWithdrawalSchedule;
  freeWithdrawalPct?: number;
}

export interface YearTaxData {
  age: number;
  isWorking: boolean;
  baselineIra: number;
  baselineTax: number;
  baselineRmd: number;
  planIra: number;
  planRoth: number;
  planTax: number;
  conversionAmount: number;
  maxFreeWithdrawal: number;
  maxFreeWithdrawalRatePct: number;
  taxesPaidFromWithdrawal: number;
  statutoryRatePct: number;
  netEffectiveRatePct: number;
  isSurrenderExpired: boolean;
}

export interface TaxSimulationOutput {
  yearlyData: YearTaxData[];
  totalBaselineTax: number;
  totalPlanTax: number;
  lifetimeTaxSaved: number;
  heirSavings: number;
  upfrontBonusDollars: number;
  grossStatutoryRatePct: number;
  overallNetEffectiveTaxRate: number;
  totalConversionsExecuted: number;
  totalRmdAvoided: number;
  terminalWealthBase: number;
}

function calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus): number {
  if (taxableIncome <= 0) return 0;
  const brackets = filingStatus === 'mfj'
    ? [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ]
    : [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 },
      ];

  let tax = 0;
  let prevLimit = 0;
  for (const b of brackets) {
    if (taxableIncome > b.limit) {
      tax += (b.limit - prevLimit) * b.rate;
      prevLimit = b.limit;
    } else {
      tax += (taxableIncome - prevLimit) * b.rate;
      break;
    }
  }
  return Math.round(tax);
}

export function runRobustTaxSimulation(params: TaxSimulationParams): TaxSimulationOutput {
  const {
    currentAge,
    retirementAge,
    endAge = 95,
    filingStatus,
    currentEarnedIncome,
    traditionalIra,
    rothBalance,
    annualFixedIncome,
    annualSocialSecurity,
    annualWithdrawalNeed,
    expectedReturn = 0.065,
    targetBracketCeiling,
    stateTaxRate,
    heirsTaxRate,
    carrierBonusPct,
    freeWithdrawalSchedule,
    freeWithdrawalPct = 0.10,
  } = params;

  let baseIra = traditionalIra;
  let planIra = traditionalIra;
  // Apply carrier upfront bonus directly to the sheltered plan balance
  const upfrontBonusDollars = Math.round(traditionalIra * carrierBonusPct);
  let planRoth = rothBalance;

  let totalBaselineTax = 0;
  let totalPlanTax = 0;
  let totalConversionsExecuted = 0;
  let totalRmdAvoided = 0;

  const yearlyData: YearTaxData[] = [];
  const standardDeduction = filingStatus === 'mfj' ? 29200 : 14600;

  for (let age = currentAge; age <= endAge; age++) {
    const isWorking = age < retirementAge;
    const contractYear = age - currentAge + 1;
    const isSurrenderExpired = contractYear > 10;

    // 1. BASELINE INACTION TRACK (Subject to mandatory RMDs and forced taxation)
    let baselineLivingDraw = 0;
    let baselineRmd = 0;

    if (!isWorking) {
      baselineLivingDraw = annualWithdrawalNeed;
      if (age >= 73) {
        const factor = UNIFORM_LIFETIME_TABLE[age] || 8.0;
        baselineRmd = Math.round(baseIra / factor);
        totalRmdAvoided += baselineRmd;
      }
    }

    const baselineDistribution = Math.max(baselineLivingDraw, baselineRmd);
    const baselineOrdinaryIncome = (isWorking ? currentEarnedIncome : 0) +
      annualFixedIncome +
      baselineDistribution +
      (annualSocialSecurity * (isWorking ? 0.85 : 0.85));

    const baselineTaxable = Math.max(0, baselineOrdinaryIncome - standardDeduction);
    const baselineFedTax = calculateFederalTax(baselineTaxable, filingStatus);
    const baselineStateTax = Math.round(baselineTaxable * stateTaxRate);
    const baselineAnnualTax = baselineFedTax + baselineStateTax;
    totalBaselineTax += baselineAnnualTax;

    // Deduct living distribution and compound remaining baseline IRA
    baseIra = Math.max(0, baseIra - baselineDistribution);
    baseIra = Math.round(baseIra * (1 + expectedReturn));

    // 2. TACTICAL ROTH CONVERSION TRACK
    let conversionAmount = 0;
    let allowedFreePct = freeWithdrawalPct;

    if (freeWithdrawalSchedule === 'tiered_2_12') {
      if (contractYear === 1) allowedFreePct = 0.02;
      else if (contractYear <= 10) allowedFreePct = 0.12;
      else allowedFreePct = 1.00;
    } else if (freeWithdrawalSchedule === 'standard_10') {
      if (contractYear === 1) allowedFreePct = 0.00;
      else if (contractYear <= 10) allowedFreePct = 0.10;
      else allowedFreePct = 1.00;
    }

    const maxFreeWithdrawal = isSurrenderExpired ? planIra : Math.round(planIra * allowedFreePct);

    if (planIra > 0) {
      const baseOrdinaryBeforeConversion = (isWorking ? currentEarnedIncome : 0) +
        annualFixedIncome +
        (annualSocialSecurity * (isWorking ? 0.85 : 0.50));
      const taxableBeforeConversion = Math.max(0, baseOrdinaryBeforeConversion - standardDeduction);
      // Adjust MFJ bracket ceiling to exact Single-filer ceiling when filingStatus is 'single'
      const effectiveBracketCeiling =
        filingStatus === 'single'
          ? Math.round(targetBracketCeiling / 2)
          : targetBracketCeiling;
      const roomInBracket = Math.max(0, effectiveBracketCeiling - taxableBeforeConversion);

      // Convert up to the ceiling or the remaining IRA
      conversionAmount = Math.min(planIra, roomInBracket);
      totalConversionsExecuted += conversionAmount;
    }

    const planOrdinaryIncome = (isWorking ? currentEarnedIncome : 0) +
      annualFixedIncome +
      conversionAmount +
      (annualSocialSecurity * (isWorking ? 0.85 : 0.50));

    const planTaxable = Math.max(0, planOrdinaryIncome - standardDeduction);
    const planFedTax = calculateFederalTax(planTaxable, filingStatus);
    const planStateTax = Math.round(planTaxable * stateTaxRate);
    const planAnnualTax = planFedTax + planStateTax;
    totalPlanTax += planAnnualTax;

    const statutoryRatePct = planTaxable > 0 ? Number(((planAnnualTax / planTaxable) * 100).toFixed(1)) : 22.0;
    const netEffectiveRatePct = Number(Math.max(0, statutoryRatePct - (carrierBonusPct * 100)).toFixed(1));

    // Contractual penalty-free liquidity handles taxes directly
    const taxesPaidFromWithdrawal = Math.min(planAnnualTax, maxFreeWithdrawal);

    // Update balances
    planIra = Math.max(0, planIra - conversionAmount);
    planRoth = planRoth + conversionAmount;

    // REALISTIC RETIREMENT LIVING SPENDING DEDUCTION:
    // Once retired, living expenses are paid out of the tax-free Roth account
    if (!isWorking) {
      planRoth = Math.max(0, planRoth - annualWithdrawalNeed);
    }

    // Compound remaining balances at growth rate
    planIra = Math.round(planIra * (1 + expectedReturn));
    planRoth = Math.round(planRoth * (1 + expectedReturn));

    yearlyData.push({
      age,
      isWorking,
      baselineIra: Math.round(baseIra),
      baselineTax: Math.round(baselineAnnualTax),
      baselineRmd: Math.round(baselineRmd),
      planIra: Math.round(planIra),
      planRoth: Math.round(planRoth),
      planTax: Math.round(planAnnualTax),
      conversionAmount: Math.round(conversionAmount),
      maxFreeWithdrawal: Math.round(maxFreeWithdrawal),
      maxFreeWithdrawalRatePct: Math.round(allowedFreePct * 100),
      taxesPaidFromWithdrawal: Math.round(taxesPaidFromWithdrawal),
      statutoryRatePct,
      netEffectiveRatePct,
      isSurrenderExpired,
    });
  }

  const lifetimeTaxSaved = Math.max(0, totalBaselineTax - totalPlanTax);
  const terminalWealthBase = yearlyData[yearlyData.length - 1]?.baselineIra ?? 0;
  const heirSavings = Math.round(terminalWealthBase * heirsTaxRate);

  const grossStatutoryRatePct = Number(((totalPlanTax / Math.max(1, totalConversionsExecuted)) * 100).toFixed(1));
  const overallNetEffectiveTaxRate = Number(Math.max(0, grossStatutoryRatePct - (carrierBonusPct * 100)).toFixed(1));

  return {
    yearlyData,
    totalBaselineTax,
    totalPlanTax,
    lifetimeTaxSaved,
    heirSavings,
    upfrontBonusDollars,
    grossStatutoryRatePct,
    overallNetEffectiveTaxRate,
    totalConversionsExecuted,
    totalRmdAvoided,
    terminalWealthBase,
  };
}