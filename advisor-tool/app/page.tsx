'use client';

import React, { useState } from 'react';
import { runRobustTaxSimulation, FilingStatus, STATE_TAX_RATES, FreeWithdrawalSchedule } from './taxEngine';
import { runWealthLogixBacktest, BacktestPeriod, BondType } from './bufferEngine';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ShieldCheck, TrendingDown, DollarSign, Users, Sliders, AlertTriangle, 
  Printer, PlayCircle, Eye, Sparkles, ChevronRight, CheckCircle2, RefreshCw,
  Award, ShieldAlert, Globe, Activity, Landmark, Wallet, Check, X, Gift, Percent, 
  MapPin, Compass, FileText, Unlock, Briefcase, MessageSquare, ClipboardList, Layers, PieChart
} from 'lucide-react';

export default function AdvisorTool() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [activeTab, setActiveTab] = useState<'story' | 'backtest' | 'roth' | 'summary'>('backtest');
  const [backtestMode, setBacktestMode] = useState<'income_fia_vs_portfolio' | 'stocks_fia_vs_6040' | 'equity_vs_fia' | 'fixed_vs_fia'>('stocks_fia_vs_6040');
  const [storyStep, setStoryStep] = useState<1 | 2 | 3>(1);

  // Accordion Navigation
  const [openSection, setOpenSection] = useState<'client' | 'income' | 'tax' | 'carrier'>('carrier');

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

  // Target Bracket Ceiling (Expanded to 37%)
  const [targetBracketCeiling, setTargetBracketCeiling] = useState(403550);
  const [heirsTaxRate, setHeirsTaxRate] = useState(0.28);
  const [taxHikeActive, setTaxHikeActive] = useState(false);

  const stateTaxRate = (STATE_TAX_RATES[selectedState]?.rate ?? 0.00);

  // Carrier Bonus & Tiered Free Withdrawal Schedule
  const [carrierBonusPct, setCarrierBonusPct] = useState(0.12);
  const [freeWithdrawalSchedule, setFreeWithdrawalSchedule] = useState<FreeWithdrawalSchedule>('tiered_2_12');
  const [customFreeWithdrawalPct, setCustomFreeWithdrawalPct] = useState(0.10);

  // Dynamic Paycheck Custom Deposit & Payout Rate
  const [customFiaDeposit, setCustomFiaDeposit] = useState(500000);
  const [incomePayoutRate, setIncomePayoutRate] = useState(0.065);

  // Bond Replacement Strategy Category: Corporate vs Aggressive vs Aggregate
  const [selectedBondType, setSelectedBondType] = useState<BondType>('corporate_ig');

  // FIA Sub-Allocation: 80% S&P 500 / 20% Fixed 3%
  const [fiaIndexedAllocationPct, setFiaIndexedAllocationPct] = useState(0.80);
  const [fiaFixedYieldRate, setFiaFixedYieldRate] = useState(0.03);

  // Backtest Parameters
  const [backtestPeriod, setBacktestPeriod] = useState<BacktestPeriod>('2008_2018');
  const [fiaCap, setFiaCap] = useState(0.095);
  const [fixedRate, setFixedRate] = useState(0.0475);

  const firstName = clientName.split('&')[0].trim() || (lang === 'es' ? 'Cliente' : 'Client');

  // Cardinal Fields Validation Check
  const isCardinalComplete = Boolean(
    clientName.trim() && 
    selectedState && 
    currentAge > 0 && 
    retirementAge > currentAge && 
    iraBalance > 0
  );

  // Multi-Year Tax Simulation Execution
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
    expectedReturn: 0.065,
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
  });

  // Effective Minimum Contractual Floor (e.g. 80% * 0.0% + 20% * 3.0% = +0.60%)
  const effectiveGuaranteedFloorPct = ((1 - fiaIndexedAllocationPct) * fiaFixedYieldRate * 100);
  const effectiveMaxCappedCreditPct = (fiaIndexedAllocationPct * fiaCap * 100) + effectiveGuaranteedFloorPct;

  // Dynamic Paycheck vs. Playcheck Calculations
  const guaranteedFiaIncome = Math.round(customFiaDeposit * incomePayoutRate);
  const traditional4PctIncome = Math.round(customFiaDeposit * 0.04);
  const annualIncomeAdvantage = guaranteedFiaIncome - traditional4PctIncome;
  const capitalNeededUnder4Pct = Math.round(guaranteedFiaIncome / 0.04);
  const liberatedCapitalForGrowth = Math.max(0, capitalNeededUnder4Pct - customFiaDeposit);
  const playcheckEquitiesRemaining = Math.max(0, iraBalance - customFiaDeposit);

  let simulated6040Bal = customFiaDeposit;
  const incomePaycheckComparison = backtest.results.map((r) => {
    const stockReturn = r.sp500Return / 100;
    const bondReturn = r.selectedBondReturn / 100;
    const blendedReturn = (stockReturn * 0.60) + (bondReturn * 0.40);

    simulated6040Bal = Math.max(0, (simulated6040Bal - guaranteedFiaIncome) * (1 + blendedReturn));
    const dynamic4PctPaycheck = Math.round(Math.max(10000, simulated6040Bal * 0.04));

    return {
      year: r.year,
      calendarYear: r.calendarYear,
      marketReturnPct: Math.round(blendedReturn * 100),
      guaranteedFiaPaycheck: guaranteedFiaIncome,
      traditional6040Paycheck: dynamic4PctPaycheck,
      simulated6040Bal: Math.round(simulated6040Bal),
    };
  });

  const t = {
    en: {
      platformTitle: "The GFI Distribution Blueprint",
      platformSubtitle: "Tax Optimization & Income Architecture",
      educationalBadge: "EDUCATIONAL & INFORMATIONAL MODEL ONLY",
      preparedFor: "Prepared for:",
      targetRetirement: "Target Retirement: Age",
      advisorPromptsHeader: "Advisor Discussion & Discovery Track",
      printSummary: "Print Summary",
      storyMode: "Story Mode",
      gfiLogix: "GFILogix Backtest",
      rothBlueprint: "Roth Blueprint",
      summaryLedger: "Executive Ledger",
      totalPreserved: "TOTAL FAMILY WEALTH PRESERVED",
      keptInFamily: "Kept in family pocket vs. IRS",
      taxUnderInaction: "TAX UNDER INACTION",
      forcedRmdDrag: "Taxes across retirement through age 95",
      downsideSafetyNet: "DOWNSIDE SAFETY NET",
      protectedSpread: "Capital protected during crash cycle",
      heirsShield: "HEIRS 10-YR TAX SHIELD",
      secureNeutralized: "SECURE 2.0 penalty neutralized",
      clientParams: "Client Parameters",
      mfj: "Married Filing Joint",
      single: "Single Filer",
      tabProfile: "Intake",
      tabIncome: "Income",
      tabTaxes: "Taxes & Bonus",
      tabCarrier: "Carrier & FIA Split",
      clientNameLabel: "Client Name(s):",
      stateResidenceLabel: "State of Residence:",
      currentAgeLabel: "Current Age:",
      targetRetirementLabel: "Target Retirement:",
      preTaxIra: "Pre-Tax IRA / 401(k):",
      existingRoth: "Existing Roth IRA:",
      earnedIncomeLabel: "Pre-Retirement Earned Income (W-2/1099):",
      spendingNeed: "Target Retirement Income:",
      socialSecurityLabel: "Social Security (Combined):",
      pensionLabel: "Pension / Other Annuities:",
      targetBracketLabel: "Target Conversion Tax Bracket Ceiling:",
      stateTaxLabel: "State Income Tax Rate:",
      heirsTaxLabel: "Heirs' Marginal Tax Bracket:",
      taxHikeTest: "🔥 Future Federal Tax Hike (+4%)",
      activeBadge: "Active",
      testBadge: "Test",
      carrierBonusLabel: "Carrier Upfront Bonus (0% - 25%):",
      freeWithdrawalScheduleLabel: "Free Withdrawal Liquidity Schedule:",
      timelineLabel: "Historical Stress Timeline:",
      fiaCapLabel: "S&P 500 Sleeve Annual Cap:",
      floorGuaranteed: "Contractual 0% Floor Guaranteed on Index Sleeve",
      act1Title: `Act 1: The IRS Tax Avalanche Trap (Ages ${currentAge} to 95)`,
      act2Title: `Act 2: The Tactical Roth Discount Runway (Ages ${currentAge} to 95)`,
      act3Title: "Act 3: Paychecks & Playchecks (Guaranteed Life Income)",
      btnTrap: "1. The Trap",
      btnSolution: "2. The Solution",
      btnShield: "3. Paychecks & Playchecks",
      estIrsCheck: "Estimated Total IRS Check (to Age 95)",
      estIrsCheckDesc: "Taxes paid from working years through age 95 without conversion planning.",
      forcedRmdAge: "Forced RMD Trigger Age",
      forcedRmdDesc: "Compulsory distributions push you into peak tax brackets.",
      ssTorpedo: "Social Security Tax Torpedo",
      ssTorpedoDesc: "Taxable retirement withdrawals cause up to 85% of Social Security benefits to be taxed.",
      inactionChartTitle: `Annual Tax Burden Under Inaction (Reflects salary, retirement spending, and age 73 RMDs):`,
      btnGoToAct2: "Step 2: See How We Dismantle This With Roth Conversions",
      btnGoToAct3: "Step 3: Secure Your Guaranteed Paychecks & Playchecks",
      btnGoToSummary: "View Executive Takeaway Proposal",
      lifetimeSavingsLabel: "Your Lifetime Tax Savings (to Age 95)",
      lifetimeSavingsDesc: "Front-loading conversions into current lower tax brackets before age 73.",
      heirShieldDesc: "Preserves wealth your beneficiaries would lose to the 10-year inherited IRA liquidation rule.",
      backtestHeading: "Paychecks & Playchecks Studio",
      backtestSubheading: "Comparing contractual paycheck security vs. standard market withdrawal rules",
      modeIncomeFia: "Paychecks (FIA) vs. 60/40",
      modeBondReplacement: "Bond Replacement (60/40 FIA vs. 60/40 Bonds)",
      modeEqVsFia: "Equities vs. FIA",
      modeFixedVsFia: "Fixed Annuity (MYGA) vs. FIA",
      incomeSpreadTitle: "Guaranteed Paycheck Advantage",
      incomeSpreadDesc: `An Income FIA produces ~$${guaranteedFiaIncome.toLocaleString()}/yr (~${(incomePayoutRate * 100).toFixed(1)}% contractual rate) vs. ~$${traditional4PctIncome.toLocaleString()}/yr under the 4.0% rule on $${customFiaDeposit.toLocaleString()}.`,
      capitalEfficiencyTitle: "Capital Efficiency (Liberated Capital)",
      capitalEfficiencyDesc: `To generate $${guaranteedFiaIncome.toLocaleString()}/yr from a 60/40 portfolio safely, you need $${capitalNeededUnder4Pct.toLocaleString()}. The FIA achieves this with $${customFiaDeposit.toLocaleString()}, leaving $${liberatedCapitalForGrowth.toLocaleString()} unencumbered for equity growth.`,
      paycheckChartTitle: `Annual Cash Flow: Guaranteed Paychecks vs. Fluctuating 60/40 Market Risk:`,
      endingBal: "Ending Accumulated Balance",
      zeroLossReality: "Contractual Floor Defense",
      downYearsDefended: "Down Market Years Protected",
      zeroLossNote: "Principal preserved in crash cycles with positive fixed interest compounding.",
      summaryTitle: "The GFI Distribution Blueprint — Executive Summary",
      practiceName: "Global Financial Impact Advisory Practice",
      tableDim: "Strategic Dimension",
      tableCurrent: "Current Path (Inaction / 60-40)",
      tablePlan: "Integrated GFI Plan",
      tableAdv: "Net Value Delivered",
      row1: "Lifetime Federal & State Taxes (to Age 95)",
      row2: "Avoided Mandatory RMDs",
      row3: "Heir SECURE Act 10-Yr Penalty",
      row4: "Guaranteed Annual Paycheck Floor",
      rowTotal: "Total Comprehensive Wealth Advantage",
    },
    es: {
      platformTitle: "The GFI Distribution Blueprint",
      platformSubtitle: "Optimización Fiscal y Arquitectura de Ingresos",
      educationalBadge: "MODELO EDUCATIVO E INFORMATIVO ÚNICAMENTE",
      preparedFor: "Preparado para:",
      targetRetirement: "Jubilación Meta: Edad",
      advisorPromptsHeader: "Guía de Preguntas Clave para el Asesor",
      printSummary: "Imprimir Resumen",
      storyMode: "Modo Narrativa",
      gfiLogix: "Simulador GFILogix",
      rothBlueprint: "Estrategia Roth",
      summaryLedger: "Resumen Ejecutivo",
      totalPreserved: "PATRIMONIO TOTAL PRESERVADO",
      keptInFamily: "Conservado en la familia frente al IRS",
      taxUnderInaction: "IMPUESTOS POR INACCIÓN",
      forcedRmdDrag: "Impuestos en jubilación hasta los 95 años",
      downsideSafetyNet: "RED DE PROTECCIÓN CONTRA CAÍDAS",
      protectedSpread: "Capital protegido en ciclos de crisis",
      heirsShield: "ESCUDO FISCAL PARA HEREDEROS (10 AÑOS)",
      secureNeutralized: "Penalidad SECURE 2.0 neutralizada",
      clientParams: "Parámetros del Cliente",
      mfj: "Casados Declarando Conjunto",
      single: "Declaración Individual",
      tabProfile: "Datos",
      tabIncome: "Ingresos",
      tabTaxes: "Impuestos y Bono",
      tabCarrier: "Aseguradora y División FIA",
      clientNameLabel: "Nombre(s) del Cliente:",
      stateResidenceLabel: "Estado de Residencia:",
      currentAgeLabel: "Edad Actual:",
      targetRetirementLabel: "Jubilación Meta:",
      preTaxIra: "Cuenta Pre-Tributaria IRA / 401(k):",
      existingRoth: "Cuenta Roth IRA Actual:",
      earnedIncomeLabel: "Ingresos Activos Pre-Jubilación (Salario):",
      spendingNeed: "Ingreso Meta para Jubilación:",
      socialSecurityLabel: "Seguro Social (Combinado):",
      pensionLabel: "Pensión / Otras Anualidades:",
      targetBracketLabel: "Límite del Tramo Impositivo Meta:",
      stateTaxLabel: "Tasa de Impuesto Estatal:",
      heirsTaxLabel: "Tramo Impositivo de los Herederos:",
      taxHikeTest: "🔥 Aumento Futuro de Impuestos (+4%)",
      activeBadge: "Activo",
      testBadge: "Probar",
      carrierBonusLabel: "Bono Inicial de Aseguradora (0% - 25%):",
      freeWithdrawalScheduleLabel: "Calendario de Retiro Libre de Penalidad:",
      timelineLabel: "Línea Temporal de Estrés Histórico:",
      fiaCapLabel: "Tope Anual del Tramo S&P 500:",
      floorGuaranteed: "Piso Contractual del 0% en Tramo Indexado",
      act1Title: `Acto 1: La Trampa Fiscal de las RMD (Edades ${currentAge} a 95)`,
      act2Title: `Acto 2: La Ventana de Conversión Táctica a Roth (Edades ${currentAge} a 95)`,
      act3Title: "Acto 3: Ingreso Garantizado y Diversión (Paychecks & Playchecks)",
      btnTrap: "1. La Trampa",
      btnSolution: "2. La Solución",
      btnShield: "3. Paychecks & Playchecks",
      estIrsCheck: "Pago Estimado Total al IRS (hasta los 95 años)",
      estIrsCheckDesc: "Impuestos pagados desde los años laborales hasta los 95 años sin conversiones planificadas.",
      forcedRmdAge: "Edad de Retiro Obligatorio (RMD)",
      forcedRmdDesc: "Los retiros obligatorios forzosos disparan los tramos tributarios más altos.",
      ssTorpedo: "Impacto Fiscal al Seguro Social",
      ssTorpedoDesc: "Los retiros de jubilación causan impuestos sobre hasta el 85% de sus beneficios.",
      inactionChartTitle: `Carga Tributaria Anual por Inacción (Refleja salarios, gastos y RMDs a los 73):`,
      btnGoToAct2: "Paso 2: Vea Cómo Neutralizamos Esto con Conversiones Roth",
      btnGoToAct3: "Paso 3: Asegure Sus Ingresos Básicos y Fondos de Diversión",
      btnGoToSummary: "Ver Propuesta Ejecutiva para el Cliente",
      lifetimeSavingsLabel: "Ahorro Tributario de por Vida (hasta los 95 años)",
      lifetimeSavingsDesc: "Conversión anticipada en tramos impositivos bajos antes de los 73 años.",
      heirShieldDesc: "Preserva el patrimonio que sus herederos perderían por la regla de liquidación a 10 años.",
      backtestHeading: "Estudio Paychecks & Playchecks",
      backtestSubheading: "Comparación de ingresos garantizados vs. reglas de retiro tradicionales",
      modeIncomeFia: "Paychecks (FIA) vs. 60/40",
      modeBondReplacement: "Reemplazo de Bonos (60/40 FIA vs 60/40 Bonos)",
      modeEqVsFia: "Acciones vs. FIA",
      modeFixedVsFia: "Anualidad Fija (MYGA) vs. FIA",
      incomeSpreadTitle: "Ventaja de Pago Contractual",
      incomeSpreadDesc: `Una FIA con ingreso genera ~$${guaranteedFiaIncome.toLocaleString()}/año (~${(incomePayoutRate * 100).toFixed(1)}%) vs. ~$${traditional4PctIncome.toLocaleString()}/año bajo la regla del 4.0% con $${customFiaDeposit.toLocaleString()}.`,
      capitalEfficiencyTitle: "Eficiencia de Capital (Capital Liberado)",
      capitalEfficiencyDesc: `Para generar $${guaranteedFiaIncome.toLocaleString()}/año de un portafolio 60/40 seguro, necesita $${capitalNeededUnder4Pct.toLocaleString()}. La FIA lo logra con $${customFiaDeposit.toLocaleString()}, liberando $${liberatedCapitalForGrowth.toLocaleString()} para crecimiento en acciones.`,
      paycheckChartTitle: `Flujo Anual: Cheques Garantizados de por Vida vs. Riesgo de Mercado 60/40:`,
      endingBal: "Balance Final Acumulado",
      zeroLossReality: "Defensa con Piso Contractual",
      downYearsDefended: "Años de Caída de Mercado Protegidos",
      zeroLossNote: "Capital preservado en crisis con rendimiento positivo de interés fijo.",
      summaryTitle: "The GFI Distribution Blueprint — Resumen Ejecutivo",
      practiceName: "Práctica de Asesoría de Global Financial Impact",
      tableDim: "Dimensión Estratégica",
      tableCurrent: "Ruta Actual (Inacción / 60-40)",
      tablePlan: "Plan Integrado GFI",
      tableAdv: "Ventaja Neta para el Cliente",
      row1: "Impuestos Federales y Estatales de por Vida (hasta 95 años)",
      row2: "Retiros Obligatorios (RMD) Evitados",
      row3: "Penalidad para Herederos (SECURE 10 Años)",
      row4: "Piso de Ingreso Vitalicio Garantizado",
      rowTotal: "Ventaja Financiera Total Integral",
    }
  };

  const currentT = t[lang];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans print:bg-white print:text-black">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <header className="border-b border-slate-800 pb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
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
                    {currentT.platformTitle}
                  </span>
                </span>
                <span className="text-xs bg-sky-500/15 border border-sky-500/40 text-sky-300 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  {currentT.platformSubtitle}
                </span>
                <span className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                  {currentT.educationalBadge}
                </span>
              </div>
              <div className="text-sm text-slate-300 mt-1.5 space-y-0.5">
                <div>
                  {currentT.preparedFor} <b className="text-white text-base">{clientName || 'Unnamed Client'}</b> ({STATE_TAX_RATES[selectedState]?.name} • {(stateTaxRate * 100).toFixed(1)}% Tax)
                </div>
                <div>
                  {currentT.targetRetirement} <b className="text-sky-300">{retirementAge}</b> • <span className="text-emerald-400 font-semibold">{lang === 'es' ? 'Proyectado hasta los 95 años' : 'Projected to Age 95'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-400" /> {currentT.printSummary}
            </button>

            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('story')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'story' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlayCircle className="w-4 h-4" /> {currentT.storyMode}
              </button>
              <button
                onClick={() => setActiveTab('backtest')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'backtest' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.gfiLogix}
              </button>
              <button
                onClick={() => setActiveTab('roth')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'roth' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.rothBlueprint}
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
                  activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.summaryLedger}
              </button>
            </div>
          </div>
        </header>

        {/* Top 4 Stat Banners */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <DollarSign className="w-4 h-4" /> {currentT.totalPreserved}
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">{currentT.keptInFamily}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-rose-400 mb-1.5 text-xs font-bold uppercase tracking-wide">
              <TrendingDown className="w-4 h-4" /> {currentT.taxUnderInaction}
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${taxAnalysis.totalBaselineTax.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">{currentT.forcedRmdDrag}</div>
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
              <Users className="w-4 h-4" /> {currentT.heirsShield}
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ${taxAnalysis.heirSavings.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">{currentT.secureNeutralized}</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Controls (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 h-fit text-sm print:hidden">
            
            {/* CARDINAL INTAKE HEADER & STATUS */}
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

            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 text-xs">
                <Sliders className="w-4 h-4 text-cyan-400" /> {currentT.clientParams}
              </span>
              <select 
                value={filingStatus} 
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs font-bold"
              >
                <option value="mfj">{currentT.mfj}</option>
                <option value="single">{currentT.single}</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setOpenSection('client')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'client' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabProfile}
              </button>
              <button
                onClick={() => setOpenSection('income')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'income' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabIncome}
              </button>
              <button
                onClick={() => setOpenSection('tax')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'tax' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabTaxes}
              </button>
              <button
                onClick={() => setOpenSection('carrier')}
                className={`py-1.5 rounded text-center font-bold transition ${
                  openSection === 'carrier' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabCarrier}
              </button>
            </div>

            {/* SECTION 1: PROFILE & CARDINAL BALANCES */}
            {openSection === 'client' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-200 block mb-1 font-semibold flex items-center justify-between text-xs">
                    <span>{currentT.clientNameLabel} <span className="text-rose-400 font-bold">*</span></span>
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
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {currentT.stateResidenceLabel} <span className="text-rose-400 font-bold">*</span>
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
                      {currentT.currentAgeLabel} <span className="text-rose-400 font-bold">*</span>
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
                      {currentT.targetRetirementLabel} <span className="text-rose-400 font-bold">*</span>
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
                    <span>{currentT.preTaxIra} <span className="text-rose-400 font-bold">*</span></span>
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
                    <span>{currentT.existingRoth}</span>
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

            {/* SECTION 2: INCOME & SPENDING */}
            {openSection === 'income' && (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span className="flex items-center gap-1 font-bold text-sky-300">
                      <Briefcase className="w-3.5 h-3.5" /> {currentT.earnedIncomeLabel} <span className="text-rose-400 font-bold">*</span>
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
                    <span className="font-bold text-emerald-300">{currentT.spendingNeed} <span className="text-rose-400 font-bold">*</span></span>
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
                  <span className="text-xs text-slate-400 block mt-1">Drives living taxes paid per year during retirement</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-200 mb-1 text-xs">
                    <span>{currentT.socialSecurityLabel}</span>
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
                    <span>{currentT.pensionLabel}</span>
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

            {/* SECTION 3: TAXES & CONVERSION BRACKETS */}
            {openSection === 'tax' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-200 block mb-1 font-semibold flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {currentT.stateResidenceLabel}
                    </span>
                    <span className="text-cyan-400 font-bold text-sm">{(stateTaxRate * 100).toFixed(1)}% Tax</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-sm"
                  >
                    {Object.entries(STATE_TAX_RATES).map(([code, s]) => (
                      <option key={code} value={code}>
                        {s.name} ({code}) — {(s.rate * 100).toFixed(1)}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-200 block mb-1 font-semibold text-xs">{currentT.targetBracketLabel}</label>
                  <select
                    value={targetBracketCeiling}
                    onChange={(e) => setTargetBracketCeiling(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-bold text-sm"
                  >
                    <option value={100800}>{lang === 'es' ? 'Tramo 12% ($100.8k MFJ / $50.4k Single)' : 'Fill 12% Bracket ($100.8k MFJ / $50.4k Single)'}</option>
                    <option value={211400}>{lang === 'es' ? 'Tramo 22% ($211.4k MFJ / $105.7k Single)' : 'Fill 22% Bracket ($211.4k MFJ / $105.7k Single)'}</option>
                    <option value={403550}>{lang === 'es' ? 'Tramo 24% ($403.5k MFJ / $201.7k Single)' : 'Fill 24% Bracket ($403.5k MFJ / $201.7k Single)'}</option>
                    <option value={512450}>{lang === 'es' ? 'Tramo 32% ($512.4k MFJ / $256.2k Single)' : 'Fill 32% Bracket ($512.4k MFJ / $256.2k Single)'}</option>
                    <option value={768700}>{lang === 'es' ? 'Tramo 35% ($768.7k MFJ / $640.0k Single)' : 'Fill 35% Bracket ($768.7k MFJ / $640.0k Single)'}</option>
                    <option value={1500000}>{lang === 'es' ? 'Tramo 37% (Máximo sin límite)' : 'Fill 37% Top Bracket (High Net Worth)'}</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <div className="flex justify-between text-slate-200 mb-1 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <Gift className="w-3.5 h-3.5" /> {currentT.carrierBonusLabel}
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
                    <div className="flex justify-between text-xs text-slate-400 mt-1 font-semibold">
                      <span>0%</span>
                      <span>10%</span>
                      <span>15%</span>
                      <span>20%</span>
                      <span className="text-cyan-400 font-bold">25% Max</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-200 block mb-1 font-semibold flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-300">
                        <Wallet className="w-3.5 h-3.5" /> {currentT.freeWithdrawalScheduleLabel}
                      </span>
                    </label>
                    <select
                      value={freeWithdrawalSchedule}
                      onChange={(e) => setFreeWithdrawalSchedule(e.target.value as FreeWithdrawalSchedule)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium text-xs"
                    >
                      <option value="tiered_2_12">American Equity Schedule (2% Yr 1 → 12% Yrs 2–10 → 100% Yr 11+)</option>
                      <option value="standard_10">Standard Industry Schedule (0% Yr 1 → 10% Yrs 2–10 → 100% Yr 11+)</option>
                      <option value="flat_10">Flat Allowance (10% Annual Flat)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between text-slate-200 mb-1 text-xs">
                      <span>{currentT.heirsTaxLabel}</span>
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

                <button
                  onClick={() => setTaxHikeActive(!taxHikeActive)}
                  className={`w-full py-2.5 px-3 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                    taxHikeActive
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-semibold">{currentT.taxHikeTest}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-bold">
                    {taxHikeActive ? currentT.activeBadge : currentT.testBadge}
                  </span>
                </button>
              </div>
            )}

            {/* SECTION 4: CARRIER, FIA DUAL-STRATEGY SPLIT & BENCHMARKS */}
            {openSection === 'carrier' && (
              <div className="space-y-4 pt-1">
                {/* DUAL-STRATEGY FIA ALLOCATION SLIDER (80% S&P / 20% FIXED 3%) */}
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
                      <span>50% S&P / 50% Fixed</span>
                      <span className="text-indigo-300 font-bold">80/20 Optimal</span>
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

                <div className="pt-2 border-t border-slate-800">
                  <label className="text-slate-300 block mb-1 text-xs font-semibold">{currentT.timelineLabel}</label>
                  <select
                    value={backtestPeriod}
                    onChange={(e) => setBacktestPeriod(e.target.value as BacktestPeriod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-bold"
                  >
                    <option value="2000_2010">2000–2010 (The &quot;Lost Decade&quot; & 2008 Crash)</option>
                    <option value="2008_2018">2008–2018 (Great Recession Recovery)</option>
                    <option value="2015_2025">2015–2024 (Modern Volatility & Tech Rally)</option>
                    <option value="all_25_years">Full 25-Year Cycle (2000–2024)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-200 mb-1 text-xs">
                    <span className="font-semibold">{currentT.fiaCapLabel}</span>
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
                  <span className="text-xs text-slate-400 mt-1 block">{currentT.floorGuaranteed}</span>
                </div>
              </div>
            )}

          </div>

          {/* Right Presentation Dashboard (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* TAB: GFILOGIX BACKTEST STUDIO */}
            {activeTab === 'backtest' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-black text-white text-xl tracking-tight">{currentT.backtestHeading}</h3>
                    <p className="text-sm text-slate-300 mt-0.5">{currentT.backtestSubheading}</p>
                  </div>

                  {/* 4 Backtest Modes */}
                  <div className="flex flex-wrap bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs gap-1">
                    <button
                      onClick={() => setBacktestMode('stocks_fia_vs_6040')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'stocks_fia_vs_6040' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {currentT.modeBondReplacement}
                    </button>
                    <button
                      onClick={() => setBacktestMode('income_fia_vs_portfolio')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'income_fia_vs_portfolio' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {currentT.modeIncomeFia}
                    </button>
                    <button
                      onClick={() => setBacktestMode('equity_vs_fia')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'equity_vs_fia' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {currentT.modeEqVsFia}
                    </button>
                    <button
                      onClick={() => setBacktestMode('fixed_vs_fia')}
                      className={`px-3 py-1.5 rounded font-bold transition ${
                        backtestMode === 'fixed_vs_fia' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {currentT.modeFixedVsFia}
                    </button>
                  </div>
                </div>

                {/* Historical Scenario Selector Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => setBacktestPeriod('2000_2010')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2000_2010' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold">2000–2010</div>
                    <div className="text-xs font-normal opacity-80 mt-0.5">Dot-Com + 2008</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('2008_2018')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2008_2018' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold">2008–2018</div>
                    <div className="text-xs font-normal opacity-80 mt-0.5">Great Recession</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('2015_2025')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2015_2025' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold">2015–2024</div>
                    <div className="text-xs font-normal opacity-80 mt-0.5">Modern Volatility</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('all_25_years')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === 'all_25_years' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold">2000–2024</div>
                    <div className="text-xs font-normal opacity-80 mt-0.5">Full 25-Year Cycle</div>
                  </button>
                </div>

                {/* MODE: BOND REPLACEMENT STRATEGY (WITH CORPORATE VS AGGRESSIVE SELECTOR) */}
                {backtestMode === 'stocks_fia_vs_6040' && (
                  <div className="space-y-4">
                    {/* BOND CATEGORY SELECTOR & STRATEGY CALLOUT */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 gap-3">
                      <div>
                        <span className="text-sm font-bold text-white block">Compare FIA Split Against:</span>
                        <span className="text-xs text-emerald-400 font-semibold">
                          Current FIA Blend: {(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P 500 ({(fiaCap * 100).toFixed(1)}% Cap) + {((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed ({(fiaFixedYieldRate * 100).toFixed(1)}%)
                        </span>
                      </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-5 rounded-xl border border-indigo-500/50 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-1.5 uppercase tracking-wide">
                          <Layers className="w-4 h-4" /> Modernized 60/40 (Stocks + Blended FIA Buffer)
                        </div>
                        <div className="text-3xl font-black text-white">
                          ${backtest.finalModernized6040Fia.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Ending balance with ${withdrawalNeed.toLocaleString()}/yr living withdrawals. Never drops below a <b>+{effectiveGuaranteedFloorPct.toFixed(2)}%</b> positive contractual floor.
                        </p>
                      </div>

                      <div className="bg-slate-950 p-5 rounded-xl border border-rose-500/50 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-1.5 uppercase tracking-wide">
                          <Activity className="w-4 h-4" /> Traditional 60/40 (Stocks + {selectedBondType === 'corporate_ig' ? 'Corporate IG Bonds' : selectedBondType === 'high_yield' ? 'Aggressive Junk Bonds' : 'US Aggregate Bonds'})
                        </div>
                        <div className="text-3xl font-black text-rose-400">
                          ${backtest.finalTraditional6040.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {selectedBondType === 'high_yield' 
                            ? 'Aggressive bonds crashed by -26.16% in 2008 alongside equities, wiping out conservative ballast.'
                            : 'Subject to duration losses and interest rate spikes (e.g. -15.76% corporate loss in 2022).'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-200 mb-2">
                        Portfolio Wealth Progression ($1.25M with ${withdrawalNeed.toLocaleString()}/yr Retirement Withdrawals):
                      </div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={backtest.results}>
                            <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v: number) => `$${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                            <Line type="monotone" dataKey="traditional6040Balance" name={`Traditional 60/40 (Stocks + ${selectedBondType === 'corporate_ig' ? 'Corporate' : selectedBondType === 'high_yield' ? 'Aggressive' : 'Agg'} Bonds)`} stroke="#f43f5e" strokeWidth={3} />
                            <Line type="monotone" dataKey="modernized6040FiaBalance" name={`Modernized 60/40 (Stocks + ${((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed / ${(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P FIA)`} stroke="#10b981" strokeWidth={3} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* ADVISOR PROMPT CARD (BOND REPLACEMENT SPECIFIC) */}
                    <div className="mt-4 p-6 bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900 border border-amber-600/50 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-400">
                        <MessageSquare className="w-5 h-5" /> {currentT.advisorPromptsHeader} — Dual-Blend (80% S&amp;P / 20% Fixed)
                      </div>
                      <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                        <div className="p-4 bg-slate-950/80 rounded-lg border border-amber-500/30 shadow-sm space-y-2.5">
                          <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                            {lang === 'es'
                              ? `"${firstName}, al colocar un 80% en la estrategia S&P 500 y un 20% en una tasa fija garantizada del 3%, su contrato tiene un piso mínimo positivo de +${effectiveGuaranteedFloorPct.toFixed(2)}% cada año sin importar lo que haga la bolsa. ¿Le da tranquilidad saber que su dinero nunca tendrá un año de 0% o pérdidas?"`
                              : `"${firstName}, by structuring the FIA with 80% linked to the S&P 500 and 20% in a 3% fixed account, your contract locks in a guaranteed minimum floor of +${effectiveGuaranteedFloorPct.toFixed(2)}% every single year—even during market crashes like 2008. Does it give you confidence knowing your conservative money earns positive interest in any environment?"`
                            }
                          </div>
                          <div className="text-sm md:text-base text-amber-200 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                            <span className="text-amber-400 font-bold mr-1.5">•</span>
                            {lang === 'es'
                              ? `"La porción fija del 20% absorbe cualquier cargo de rider y garantiza que el contrato siempre crezca, mientras el 80% indexado captura el repunte del S&P 500."`
                              : `"The 20% fixed sleeve guarantees positive compound interest every year, while the 80% index sleeve captures strong S&P 500 bull market runs up to the cap."`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE: PAYCHECKS (FIA) VS 60/40 */}
                {backtestMode === 'income_fia_vs_portfolio' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-5 rounded-xl border border-emerald-500/40 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">
                          <Wallet className="w-4 h-4" /> {currentT.incomeSpreadTitle}
                        </div>
                        <div className="text-3xl font-black text-white">
                          ${guaranteedFiaIncome.toLocaleString()}/yr
                          <span className="text-sm text-emerald-400 ml-2 font-bold">
                            (+${annualIncomeAdvantage.toLocaleString()}/yr vs. 4% rule)
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Generated from ${customFiaDeposit.toLocaleString()} allocation at a {(incomePayoutRate * 100).toFixed(1)}% contractual rate.
                        </p>
                      </div>

                      <div className="bg-slate-950 p-5 rounded-xl border border-cyan-500/40 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wide">
                          <Landmark className="w-4 h-4" /> {currentT.capitalEfficiencyTitle}
                        </div>
                        <div className="text-3xl font-black text-cyan-300">
                          +${liberatedCapitalForGrowth.toLocaleString()} Liberated
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{currentT.capitalEfficiencyDesc}</p>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-200 mb-2">{currentT.paycheckChartTitle}</div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={incomePaycheckComparison}>
                            <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v: number) => `$${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                            <Bar dataKey="traditional6040Paycheck" name="Traditional 4% Paycheck (Drops in Bear Markets)" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="guaranteedFiaPaycheck" name="Guaranteed Life Paycheck (Contractual Floor)" fill="#10b981" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE: EQUITIES VS FIA ACCUMULATION */}
                {backtestMode === 'equity_vs_fia' && (
                  <div className="space-y-4">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={backtest.results}>
                          <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v: number) => `$${v / 1000}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Line type="monotone" dataKey="equityBalance" name="S&P 500 Equities (-1% Fee)" stroke="#f43f5e" strokeWidth={3} />
                          <Line type="monotone" dataKey="fiaBalance" name={`FIA (${(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P / ${((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed)`} stroke="#06b6d4" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-300 font-bold uppercase">{currentT.endingBal}</span>
                        <div className="text-2xl font-black text-cyan-400 mt-1">${backtest.finalFia.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-0.5">vs. ${backtest.finalEquity.toLocaleString()} in market equities</p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-300 font-bold uppercase">{currentT.zeroLossReality}</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">{backtest.zeroLossYearsCount} {currentT.downYearsDefended}</div>
                        <p className="text-xs text-slate-400 mt-0.5">Guaranteed minimum positive floor: +{effectiveGuaranteedFloorPct.toFixed(2)}% / yr</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE: FIXED ANNUITY VS FIA */}
                {backtestMode === 'fixed_vs_fia' && (
                  <div className="space-y-4">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={backtest.results}>
                          <XAxis dataKey="calendarYear" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v: number) => `$${v / 1000}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                          <Line type="monotone" dataKey="fixedAnnuityBalance" name={`Fixed Annuity / CD (${(fixedRate * 100).toFixed(2)}% Net of Tax)`} stroke="#94a3b8" strokeWidth={3} />
                          <Line type="monotone" dataKey="fiaBalance" name={`FIA (${(fiaIndexedAllocationPct * 100).toFixed(0)}% S&P / ${((1 - fiaIndexedAllocationPct) * 100).toFixed(0)}% Fixed)`} stroke="#06b6d4" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-300 font-bold uppercase">{currentT.endingBal}</span>
                        <div className="text-2xl font-black text-cyan-400 mt-1">${backtest.finalFia.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-0.5">vs. ${backtest.finalFixed.toLocaleString()} in taxable fixed CDs</p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-300 font-bold uppercase">{currentT.zeroLossReality}</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">{backtest.zeroLossYearsCount} {currentT.downYearsDefended}</div>
                        <p className="text-xs text-slate-400 mt-0.5">{currentT.zeroLossNote}</p>
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
                      {lang === 'es' ? 'Estrategia Roth con Calendario de Retiros Libres' : 'Roth Blueprint with Full Conversion Runway'}
                    </h3>
                    <p className="text-sm text-slate-300 mt-0.5">
                      State: <b className="text-cyan-300 font-bold">{STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</b> • Schedule: <b className="text-emerald-300 font-bold">{freeWithdrawalSchedule === 'tiered_2_12' ? '2% Yr 1 → 12% Yrs 2–10 → 100% Yr 11+' : freeWithdrawalSchedule}</b>
                    </p>
                  </div>
                  <span className="text-sm font-black text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-4 py-1.5 rounded-full shadow-sm">
                    {lang === 'es' ? 'Ahorro Fiscal Total:' : 'Total Lifetime Savings:'} ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
                  </span>
                </div>

                {/* Tactical Stat Cards */}
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

                {/* Multi-Year Taxes Graph */}
                <div>
                  <div className="text-sm font-bold text-slate-200 mb-2.5">
                    Annual Tax Comparison (Reflects salary, retirement living withdrawals, and age 73 RMDs):
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taxAnalysis.yearlyData}>
                        <XAxis dataKey="age" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#cbd5e1' }} tickFormatter={(v: number) => `$${v / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '13px', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                        <Bar dataKey="baselineTax" name="Taxes Under Inaction" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="planTax" name="Plan Tax (Covered by Free Withdrawal)" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
              </div>
            )}

            {/* TAB: SUMMARY LEDGER */}
            {activeTab === 'summary' && (
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl space-y-6 shadow-sm print:border-none print:p-0">
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Global Financial Impact" className="h-12 w-auto object-contain" />
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{currentT.summaryTitle}</h1>
                      <p className="text-sm text-gray-600">{currentT.practiceName}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div><b>{currentT.preparedFor}</b> {clientName}</div>
                    <div><b>State:</b> {STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</div>
                    <div><b>Target Retirement:</b> Age {retirementAge}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800 text-slate-300 uppercase tracking-wider text-xs font-bold print:text-black">
                        <th className="py-3 px-3">{currentT.tableDim}</th>
                        <th className="py-3 px-3">{currentT.tableCurrent}</th>
                        <th className="py-3 px-3">{currentT.tablePlan}</th>
                        <th className="py-3 px-3 text-right">{currentT.tableAdv}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200 print:text-black">
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">{currentT.row1}</td>
                        <td className="py-3.5 px-3">${taxAnalysis.totalBaselineTax.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-bold print:text-black">${taxAnalysis.totalPlanTax.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right text-emerald-400 font-bold print:text-black">+${taxAnalysis.lifetimeTaxSaved.toLocaleString()}</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">State of Residence Tax Impact</td>
                        <td className="py-3.5 px-3">{STATE_TAX_RATES[selectedState]?.name}</td>
                        <td className="py-3.5 px-3 text-cyan-400 font-bold print:text-black">{(stateTaxRate * 100).toFixed(1)}% Tax</td>
                        <td className="py-3.5 px-3 text-right text-cyan-400 font-bold print:text-black">Calibrated</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">Carrier Premium Bonus Offset</td>
                        <td className="py-3.5 px-3">$0 (None)</td>
                        <td className="py-3.5 px-3 text-cyan-400 font-bold print:text-black">+${taxAnalysis.upfrontBonusDollars.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right text-cyan-400 font-bold print:text-black">
                          {(carrierBonusPct * 100).toFixed(0)}% Bonus
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">Net Effective Conversion Tax Rate</td>
                        <td className="py-3.5 px-3">{taxAnalysis.grossStatutoryRatePct}% (Progressive)</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-bold print:text-black">{taxAnalysis.overallNetEffectiveTaxRate}%</td>
                        <td className="py-3.5 px-3 text-right text-emerald-400 font-bold print:text-black">
                          -{(carrierBonusPct * 100).toFixed(0)}% Net Discount
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">{currentT.row2}</td>
                        <td className="py-3.5 px-3">$0</td>
                        <td className="py-3.5 px-3 text-indigo-400 font-bold print:text-black">${taxAnalysis.totalRmdAvoided.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right text-indigo-400 font-bold print:text-black">Sheltered</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">{currentT.row3}</td>
                        <td className="py-3.5 px-3">${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-indigo-400 font-bold print:text-black">$0 (Roth)</td>
                        <td className="py-3.5 px-3 text-right text-indigo-400 font-bold print:text-black">+${taxAnalysis.heirSavings.toLocaleString()}</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 font-semibold text-white">{currentT.row4}</td>
                        <td className="py-3.5 px-3">${traditional4PctIncome.toLocaleString()}/yr (Subject to market swings)</td>
                        <td className="py-3.5 px-3 text-emerald-400 font-bold print:text-black">${guaranteedFiaIncome.toLocaleString()}/yr</td>
                        <td className="py-3.5 px-3 text-right text-emerald-400 font-bold print:text-black">+${annualIncomeAdvantage.toLocaleString()}/yr Floor</td>
                      </tr>
                      <tr className="bg-indigo-950/50 print:bg-gray-100 font-black text-base border-t-2 border-indigo-500/70">
                        <td className="py-4 px-3 text-white print:text-black">{currentT.rowTotal}</td>
                        <td className="py-4 px-3">--</td>
                        <td className="py-4 px-3">--</td>
                        <td className="py-4 px-3 text-right text-emerald-400 text-lg print:text-black">
                          +${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings + taxAnalysis.upfrontBonusDollars).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Regulatory Disclosures */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-400 leading-relaxed space-y-3 print:text-black print:border-slate-400">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-slate-300 print:text-black text-xs">
            <FileText className="w-4 h-4 text-cyan-400 print:hidden" />
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

          <p className="text-xs text-slate-500 print:text-gray-600">
            © 2026 Global Financial Impact (GFI). All rights reserved. Calculations are generated via mathematical simulation models and do not constitute a formal insurance illustration or prospectus. For official contract values, obtain a carrier-approved product illustration from a properly appointed, state-licensed insurance producer.
          </p>
        </footer>

      </div>
    </main>
  );
}