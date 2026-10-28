'use client';

import React, { useState } from 'react';
import { runRobustTaxSimulation, FilingStatus, STATE_TAX_RATES, FreeWithdrawalSchedule } from './taxEngine';
import { runWealthLogixBacktest, BacktestPeriod } from './bufferEngine';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ShieldCheck, TrendingDown, DollarSign, Users, Sliders, AlertTriangle, 
  Printer, PlayCircle, Eye, EyeOff, Sparkles, ChevronRight, CheckCircle2, RefreshCw,
  Award, ShieldAlert, Globe, Activity, Landmark, Wallet, Check, X, Gift, Percent, MapPin, Compass, FileText
} from 'lucide-react';

export default function AdvisorTool() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [activeTab, setActiveTab] = useState<'story' | 'backtest' | 'roth' | 'summary'>('roth');
  const [backtestMode, setBacktestMode] = useState<'income_fia_vs_portfolio' | 'equity_vs_fia' | 'fixed_vs_fia'>('income_fia_vs_portfolio');
  const [storyStep, setStoryStep] = useState<1 | 2 | 3>(1);
  const [showAdvisorNotes, setShowAdvisorNotes] = useState(true);

  // Section Accordion Navigation for Inputs
  const [openSection, setOpenSection] = useState<'client' | 'income' | 'tax' | 'carrier'>('tax');

  // Client Demographics & Balances
  const [clientName, setClientName] = useState('John & Mary Smith');
  const [selectedState, setSelectedState] = useState<string>('FL');
  const [currentAge, setCurrentAge] = useState(61);
  const [retirementAge, setRetirementAge] = useState(65);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('mfj');
  const [iraBalance, setIraBalance] = useState(1250000);
  const [rothBalance, setRothBalance] = useState(40000);

  // Retirement Income & Needs
  const [withdrawalNeed, setWithdrawalNeed] = useState(60000);
  const [socialSecurity, setSocialSecurity] = useState(48000);
  const [fixedIncome, setFixedIncome] = useState(20000);

  // Tax Planning Parameters
  const [targetBracketCeiling, setTargetBracketCeiling] = useState(201050); // 22% MFJ
  const [heirsTaxRate, setHeirsTaxRate] = useState(0.28);
  const [taxHikeActive, setTaxHikeActive] = useState(false);

  // State tax rate is driven by selected state
  const stateTaxRate = (STATE_TAX_RATES[selectedState]?.rate ?? 0.00);

  // Carrier Bonus & Tiered Free Withdrawal Schedule
  const [carrierBonusPct, setCarrierBonusPct] = useState(0.12);
  const [freeWithdrawalSchedule, setFreeWithdrawalSchedule] = useState<FreeWithdrawalSchedule>('tiered_2_12');
  const [customFreeWithdrawalPct, setCustomFreeWithdrawalPct] = useState(0.10);

  // Backtest & Income Rider Parameters
  const [backtestPeriod, setBacktestPeriod] = useState<BacktestPeriod>('2000_2010');
  const [fiaCap, setFiaCap] = useState(0.095);
  const [fixedRate, setFixedRate] = useState(0.0475);
  const [incomeAllocationPct, setIncomeAllocationPct] = useState(0.40);
  const [incomePayoutRate, setIncomePayoutRate] = useState(0.065);

  // Personalized Client First Name
  const firstName = clientName.split('&')[0].trim() || (lang === 'es' ? 'Cliente' : 'Client');

  // Run Calculations
  const taxAnalysis = runRobustTaxSimulation({
    currentAge,
    retirementAge,
    endAge: 95,
    filingStatus,
    traditionalIra: iraBalance,
    rothBalance,
    taxableBrokerage: 0,
    annualFixedIncome: fixedIncome,
    annualSocialSecurity: socialSecurity,
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
    fiaCap,
    fiaFloor: 0.0,
    fiaParticipation: 1.0,
    fixedRate,
    taxRateOnFixed: 0.24,
  });

  // Income FIA vs. Traditional 60/40 Portfolio Calculations
  const incomeDedicatedCapital = Math.round(iraBalance * incomeAllocationPct);
  const guaranteedFiaIncome = Math.round(incomeDedicatedCapital * incomePayoutRate);
  const traditional4PctIncome = Math.round(incomeDedicatedCapital * 0.04);
  const annualIncomeAdvantage = guaranteedFiaIncome - traditional4PctIncome;
  const capitalNeededUnder4Pct = Math.round(guaranteedFiaIncome / 0.04);
  const liberatedCapitalForGrowth = Math.max(0, capitalNeededUnder4Pct - incomeDedicatedCapital);

  // Paycheck Stream Comparison
  let simulated6040Bal = incomeDedicatedCapital;
  const incomePaycheckComparison = backtest.results.map((r) => {
    const stockReturn = r.sp500Return / 100;
    const bondReturn = 0.035;
    const blendedReturn = (stockReturn * 0.60) + (bondReturn * 0.40);

    simulated6040Bal = Math.max(0, (simulated6040Bal - guaranteedFiaIncome) * (1 + blendedReturn));
    const dynamic4PctPaycheck = Math.round(Math.max(12000, simulated6040Bal * 0.04));

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
      showPrompts: "Discussion Prompts Active",
      hidePrompts: "Show Discussion Prompts",
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
      tabProfile: "Profile",
      tabIncome: "Income",
      tabTaxes: "Taxes & Bonus",
      tabCarrier: "Carrier",
      clientNameLabel: "Client Name(s):",
      stateResidenceLabel: "State of Residence:",
      currentAgeLabel: "Current Age:",
      targetRetirementLabel: "Target Retirement:",
      preTaxIra: "Pre-Tax IRA / 401(k):",
      existingRoth: "Existing Roth IRA:",
      spendingNeed: "Target Retirement Income:",
      socialSecurityLabel: "Social Security (Combined):",
      pensionLabel: "Pension / Other Annuities:",
      targetBracketLabel: "Target Tax Bracket Ceiling:",
      stateTaxLabel: "State Income Tax Rate:",
      heirsTaxLabel: "Heirs' Marginal Tax Bracket:",
      taxHikeTest: "🔥 Future Federal Tax Hike (+4%)",
      activeBadge: "Active",
      testBadge: "Test",
      carrierBonusLabel: "Carrier Upfront Bonus (0% - 25%):",
      freeWithdrawalScheduleLabel: "Free Withdrawal Liquidity Schedule:",
      timelineLabel: "Historical Stress Timeline:",
      fiaCapLabel: "FIA Annual Cap (S&P 500):",
      floorGuaranteed: "Contractual 0% Floor Guaranteed",
      fixedBenchmarkLabel: "Fixed Annuity / CD Benchmark:",
      act1Title: `Act 1: The IRS Tax Avalanche Trap (Ages ${currentAge} to 95)`,
      act2Title: `Act 2: The Tactical Roth Discount Runway (Ages ${currentAge} to 95)`,
      act3Title: "Act 3: Paychecks & Playchecks (Guaranteed Life Income)",
      btnTrap: "1. The Trap",
      btnSolution: "2. The Solution",
      btnShield: "3. Paychecks & Playchecks",
      estIrsCheck: "Estimated Total IRS Check (to Age 95)",
      estIrsCheckDesc: "Taxes paid from retirement age through age 95 without conversion planning.",
      forcedRmdAge: "Forced RMD Trigger Age",
      forcedRmdDesc: "Compulsory distributions push you into peak tax brackets.",
      ssTorpedo: "Social Security Tax Torpedo",
      ssTorpedoDesc: "Taxable retirement withdrawals cause up to 85% of Social Security benefits to be taxed.",
      inactionChartTitle: `Annual Tax Burden Under Inaction (Taxes start at retirement age ${retirementAge} and escalate at 73):`,
      btnGoToAct2: "Step 2: See How We Dismantle This With Roth Conversions",
      btnGoToAct3: "Step 3: Secure Your Guaranteed Paychecks & Playchecks",
      btnGoToSummary: "View Executive Takeaway Proposal",
      lifetimeSavingsLabel: "Your Lifetime Tax Savings (to Age 95)",
      lifetimeSavingsDesc: "Front-loading conversions into current lower tax brackets before age 73.",
      heirShieldDesc: "Preserves wealth your beneficiaries would lose to the 10-year inherited IRA liquidation rule.",
      backtestHeading: "Paychecks & Playchecks Studio",
      backtestSubheading: "Comparing contractual paycheck security vs. standard market withdrawal rules",
      modeEqVsFia: "Equities vs. FIA",
      modeFixedVsFia: "Fixed Annuity (MYGA) vs. FIA",
      modeIncomeFia: "Paychecks (FIA) vs. 60/40 Portfolio",
      incomeSpreadTitle: "Guaranteed Paycheck Advantage",
      incomeSpreadDesc: `An Income FIA produces ~$${guaranteedFiaIncome.toLocaleString()}/yr (~${(incomePayoutRate * 100).toFixed(1)}% contractual rate) vs. ~$${traditional4PctIncome.toLocaleString()}/yr under the 4.0% rule on $${incomeDedicatedCapital.toLocaleString()}.`,
      capitalEfficiencyTitle: "Capital Efficiency (Liberated Capital)",
      capitalEfficiencyDesc: `To generate $${guaranteedFiaIncome.toLocaleString()}/yr from a 60/40 portfolio safely, you need $${capitalNeededUnder4Pct.toLocaleString()}. The FIA achieves this with $${incomeDedicatedCapital.toLocaleString()}, leaving $${liberatedCapitalForGrowth.toLocaleString()} unencumbered for equity growth.`,
      paycheckChartTitle: `Annual Cash Flow: Guaranteed Paychecks vs. Fluctuating 60/40 Market Risk:`,
      endingBal: "Ending Accumulated Balance",
      zeroLossReality: "Contractual 0% Floor Protection",
      downYearsDefended: "Down Market Years Defended",
      zeroLossNote: "Principal preserved in crash cycles with zero negative returns.",
      summaryTitle: "The GFI Distribution Blueprint™ — Executive Summary",
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
      platformTitle: "The GFI Distribution Blueprint™",
      platformSubtitle: "Optimización Fiscal y Arquitectura de Ingresos",
      educationalBadge: "MODELO EDUCATIVO E INFORMATIVO ÚNICAMENTE",
      preparedFor: "Preparado para:",
      targetRetirement: "Jubilación Meta: Edad",
      showPrompts: "Preguntas Clave Activas",
      hidePrompts: "Mostrar Preguntas Clave",
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
      tabProfile: "Perfil",
      tabIncome: "Ingresos",
      tabTaxes: "Impuestos y Bono",
      tabCarrier: "Aseguradora",
      clientNameLabel: "Nombre(s) del Cliente:",
      stateResidenceLabel: "Estado de Residencia:",
      currentAgeLabel: "Edad Actual:",
      targetRetirementLabel: "Jubilación Meta:",
      preTaxIra: "Cuenta Pre-Tributaria IRA / 401(k):",
      existingRoth: "Cuenta Roth IRA Actual:",
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
      fiaCapLabel: "Tope Anual FIA (S&P 500):",
      floorGuaranteed: "Garantía Contractual con Piso del 0%",
      fixedBenchmarkLabel: "Rendimiento Anualidad Fija / CD:",
      act1Title: `Acto 1: La Trampa Fiscal de las RMD (Edades ${currentAge} a 95)`,
      act2Title: `Acto 2: La Ventana de Conversión Táctica a Roth (Edades ${currentAge} a 95)`,
      act3Title: "Acto 3: Ingreso Garantizado y Diversión (Paychecks & Playchecks)",
      btnTrap: "1. La Trampa",
      btnSolution: "2. La Solución",
      btnShield: "3. Paychecks & Playchecks",
      estIrsCheck: "Pago Estimado Total al IRS (hasta los 95 años)",
      estIrsCheckDesc: "Impuestos pagados desde la edad de jubilación hasta los 95 años sin conversiones planificadas.",
      forcedRmdAge: "Edad de Retiro Obligatorio (RMD)",
      forcedRmdDesc: "Los retiros obligatorios forzosos disparan los tramos tributarios más altos.",
      ssTorpedo: "Impacto Fiscal al Seguro Social",
      ssTorpedoDesc: "Los retiros de jubilación causan impuestos sobre hasta el 85% de sus beneficios.",
      inactionChartTitle: `Carga Tributaria Anual por Inacción (Los impuestos comienzan a la edad de retiro ${retirementAge} y suben a los 73):`,
      btnGoToAct2: "Paso 2: Vea Cómo Neutralizamos Esto con Conversiones Roth",
      btnGoToAct3: "Paso 3: Asegure Sus Ingresos Básicos y Fondos de Diversión",
      btnGoToSummary: "Ver Propuesta Ejecutiva para el Cliente",
      lifetimeSavingsLabel: "Ahorro Tributario de por Vida (hasta los 95 años)",
      lifetimeSavingsDesc: "Conversión anticipada en tramos impositivos bajos antes de los 73 años.",
      heirShieldDesc: "Preserva el patrimonio que sus herederos perderían por la regla de liquidación a 10 años.",
      backtestHeading: "Estudio Paychecks & Playchecks",
      backtestSubheading: "Comparación de ingresos garantizados vs. reglas de retiro tradicionales",
      modeEqVsFia: "Acciones vs. FIA",
      modeFixedVsFia: "Anualidad Fija (MYGA) vs. FIA",
      modeIncomeFia: "Paychecks (FIA) vs. 60/40",
      incomeSpreadTitle: "Ventaja de Pago Contractual",
      incomeSpreadDesc: `Una FIA con ingreso genera ~$${guaranteedFiaIncome.toLocaleString()}/año (~${(incomePayoutRate * 100).toFixed(1)}%) vs. ~$${traditional4PctIncome.toLocaleString()}/año bajo la regla del 4.0% con $${incomeDedicatedCapital.toLocaleString()}.`,
      capitalEfficiencyTitle: "Eficiencia de Capital (Capital Liberado)",
      capitalEfficiencyDesc: `Para generar $${guaranteedFiaIncome.toLocaleString()}/año de un portafolio 60/40 seguro, necesita $${capitalNeededUnder4Pct.toLocaleString()}. La FIA lo logra con $${incomeDedicatedCapital.toLocaleString()}, liberando $${liberatedCapitalForGrowth.toLocaleString()} para crecimiento en acciones.`,
      paycheckChartTitle: `Flujo Anual: Cheques Garantizados de por Vida vs. Riesgo de Mercado 60/40:`,
      endingBal: "Balance Final Acumulado",
      zeroLossReality: "Protección Contractual con Piso del 0%",
      downYearsDefended: "Años de Caída de Mercado Defendidos",
      zeroLossNote: "Capital preservado en ciclos de crisis con cero rendimientos negativos.",
      summaryTitle: "The GFI Distribution Blueprint™ — Resumen Ejecutivo",
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
        <header className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-md border border-slate-700/60 flex items-center justify-center shrink-0 min-w-[70px] min-h-[44px]">
              <img
                src="/logo.png"
                alt="Global Financial Impact Logo"
                className="h-10 w-auto object-contain"
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                    {currentT.platformTitle}
                  </span>
                </span>
                <span className="text-[10px] bg-sky-500/10 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full font-mono">
                  {currentT.platformSubtitle}
                </span>
                <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {currentT.educationalBadge}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                <div>
                  {currentT.preparedFor} <b className="text-slate-200">{clientName}</b> ({STATE_TAX_RATES[selectedState]?.name} • {(stateTaxRate * 100).toFixed(1)}% Tax)
                </div>
                <div>
                  {currentT.targetRetirement} <b className="text-sky-300">{retirementAge}</b> • <span className="text-emerald-400 font-semibold">{lang === 'es' ? 'Proyectado hasta los 95 años' : 'Projected to Age 95'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                  lang === 'en' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" /> EN
              </button>
              <button
                onClick={() => setLang('es')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                  lang === 'es' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" /> ES
              </button>
            </div>

            <button
              onClick={() => setShowAdvisorNotes(!showAdvisorNotes)}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                showAdvisorNotes 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {showAdvisorNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showAdvisorNotes ? currentT.showPrompts : currentT.hidePrompts}
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" /> {currentT.printSummary}
            </button>

            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('story')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'story' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" /> {currentT.storyMode}
              </button>
              <button
                onClick={() => setActiveTab('backtest')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'backtest' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.gfiLogix}
              </button>
              <button
                onClick={() => setActiveTab('roth')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'roth' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.rothBlueprint}
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.summaryLedger}
              </button>
            </div>
          </div>
        </header>

        {/* Top 4 Stat Banners */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 mb-1 text-xs font-semibold">
              <DollarSign className="w-4 h-4" /> {currentT.totalPreserved}
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              ${(taxAnalysis.lifetimeTaxSaved + taxAnalysis.heirSavings).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{currentT.keptInFamily}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-rose-400 mb-1 text-xs font-semibold">
              <TrendingDown className="w-4 h-4" /> {currentT.taxUnderInaction}
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              ${taxAnalysis.totalBaselineTax.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{currentT.forcedRmdDrag}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-400 mb-1 text-xs font-semibold">
              <Percent className="w-4 h-4" /> NET CONVERSION TAX RATE
            </div>
            <div className="text-2xl font-bold tracking-tight text-cyan-300">
              {taxAnalysis.overallNetEffectiveTaxRate}%
              <span className="text-xs text-slate-400 font-normal line-through ml-2">
                {taxAnalysis.grossStatutoryRatePct}%
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
              {(carrierBonusPct * 100).toFixed(0)}% Carrier Bonus offsets tax friction in {selectedState}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-400 mb-1 text-xs font-semibold">
              <Users className="w-4 h-4" /> {currentT.heirsShield}
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              ${taxAnalysis.heirSavings.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{currentT.secureNeutralized}</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Controls (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 h-fit text-xs print:hidden">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" /> {currentT.clientParams}
              </span>
              <select 
                value={filingStatus} 
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              >
                <option value="mfj">{currentT.mfj}</option>
                <option value="single">{currentT.single}</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setOpenSection('client')}
                className={`py-1 rounded text-center font-medium transition ${
                  openSection === 'client' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabProfile}
              </button>
              <button
                onClick={() => setOpenSection('income')}
                className={`py-1 rounded text-center font-medium transition ${
                  openSection === 'income' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabIncome}
              </button>
              <button
                onClick={() => setOpenSection('tax')}
                className={`py-1 rounded text-center font-medium transition ${
                  openSection === 'tax' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabTaxes}
              </button>
              <button
                onClick={() => setOpenSection('carrier')}
                className={`py-1 rounded text-center font-medium transition ${
                  openSection === 'carrier' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentT.tabCarrier}
              </button>
            </div>

            {/* SECTION 1: PROFILE & BALANCES */}
            {openSection === 'client' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-400 block mb-1">{currentT.clientNameLabel}</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {currentT.stateResidenceLabel}
                    </span>
                    <span className="text-cyan-400 font-bold">{(stateTaxRate * 100).toFixed(1)}% Tax</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                  >
                    {Object.entries(STATE_TAX_RATES).map(([code, s]) => (
                      <option key={code} value={code}>
                        {s.name} ({code}) — {(s.rate * 100).toFixed(1)}% Tax
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">{currentT.currentAgeLabel}</label>
                    <input
                      type="number"
                      min={45}
                      max={75}
                      value={currentAge}
                      onChange={(e) => setCurrentAge(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">{currentT.targetRetirementLabel}</label>
                    <input
                      type="number"
                      min={50}
                      max={75}
                      value={retirementAge}
                      onChange={(e) => setRetirementAge(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-indigo-400 font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>{currentT.preTaxIra}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={iraBalance}
                        onChange={(e) => setIraBalance(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-right"
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
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>{currentT.existingRoth}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={rothBalance}
                        onChange={(e) => setRothBalance(Number(e.target.value))}
                        className="w-28 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 font-bold text-right"
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
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: INCOME & SPENDING */}
            {openSection === 'income' && (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>{currentT.spendingNeed}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={withdrawalNeed}
                        onChange={(e) => setWithdrawalNeed(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-right"
                      />
                      <span className="text-slate-500">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="200000"
                    step="5000"
                    value={withdrawalNeed}
                    onChange={(e) => setWithdrawalNeed(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>{currentT.socialSecurityLabel}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={socialSecurity}
                        onChange={(e) => setSocialSecurity(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-right"
                      />
                      <span className="text-slate-500">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="80000"
                    step="1000"
                    value={socialSecurity}
                    onChange={(e) => setSocialSecurity(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>{currentT.pensionLabel}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        step={1000}
                        value={fixedIncome}
                        onChange={(e) => setFixedIncome(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-right"
                      />
                      <span className="text-slate-500">/yr</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80000"
                    step="2000"
                    value={fixedIncome}
                    onChange={(e) => setFixedIncome(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* SECTION 3: TAXES, BONUS & DYNAMIC SCHEDULE */}
            {openSection === 'tax' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {currentT.stateResidenceLabel}
                    </span>
                    <span className="text-cyan-400 font-bold">{(stateTaxRate * 100).toFixed(1)}% Tax</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
                  >
                    {Object.entries(STATE_TAX_RATES).map(([code, s]) => (
                      <option key={code} value={code}>
                        {s.name} ({code}) — {(s.rate * 100).toFixed(1)}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">{currentT.targetBracketLabel}</label>
                  <select
                    value={targetBracketCeiling}
                    onChange={(e) => setTargetBracketCeiling(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-200"
                  >
                    <option value={94300}>{lang === 'es' ? 'Llenar Tramo 12% ($94.3k MFJ / $47.1k Indiv)' : 'Fill 12% Bracket ($94.3k MFJ / $47.1k Single)'}</option>
                    <option value={201050}>{lang === 'es' ? 'Llenar Tramo 22% ($201k MFJ / $100k Indiv)' : 'Fill 22% Bracket ($201k MFJ / $100k Single)'}</option>
                    <option value={383900}>{lang === 'es' ? 'Llenar Tramo 24% ($383.9k MFJ / $191k Indiv)' : 'Fill 24% Bracket ($383.9k MFJ / $191k Single)'}</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                        <Gift className="w-3.5 h-3.5" /> {currentT.carrierBonusLabel}
                      </span>
                      <span className="font-bold text-cyan-400">
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
                      className="w-full accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>0%</span>
                      <span>10%</span>
                      <span>15%</span>
                      <span>20%</span>
                      <span className="text-cyan-400 font-bold">25% Max</span>
                    </div>
                  </div>

                  {/* Dynamic Free Withdrawal Schedule Selector */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-300">
                        <Wallet className="w-3.5 h-3.5" /> {currentT.freeWithdrawalScheduleLabel}
                      </span>
                    </label>
                    <select
                      value={freeWithdrawalSchedule}
                      onChange={(e) => setFreeWithdrawalSchedule(e.target.value as FreeWithdrawalSchedule)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-medium text-xs"
                    >
                      <option value="tiered_2_12">American Equity Schedule (2% Yr 1 → 12% Yrs 2–10)</option>
                      <option value="standard_10">Standard Industry Schedule (0% Yr 1 → 10% Yr 2+)</option>
                      <option value="flat_10">Flat Allowance (10% Every Year)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {freeWithdrawalSchedule === 'tiered_2_12' && 'Year 1 permits 2% free withdrawal (~$' + Math.round(iraBalance * 0.02).toLocaleString() + ') to begin immediate conversions, expanding to 12% in Year 2+.'}
                      {freeWithdrawalSchedule === 'standard_10' && 'Conversions begin Year 2 once 10% penalty-free withdrawal becomes active.'}
                      {freeWithdrawalSchedule === 'flat_10' && 'Flat 10% annual free liquidity modeled across all contract durations.'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>{currentT.heirsTaxLabel}</span>
                      <span className="font-bold text-slate-200">{(heirsTaxRate * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.12"
                      max="0.37"
                      step="0.02"
                      value={heirsTaxRate}
                      onChange={(e) => setHeirsTaxRate(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setTaxHikeActive(!taxHikeActive)}
                  className={`w-full py-2 px-3 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                    taxHikeActive
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span>{currentT.taxHikeTest}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {taxHikeActive ? currentT.activeBadge : currentT.testBadge}
                  </span>
                </button>
              </div>
            )}

            {/* SECTION 4: CARRIER & INCOME */}
            {openSection === 'carrier' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-slate-400 block mb-1">{currentT.timelineLabel}</label>
                  <select
                    value={backtestPeriod}
                    onChange={(e) => setBacktestPeriod(e.target.value as BacktestPeriod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-200"
                  >
                    <option value="2000_2010">2000–2010 (The &quot;Lost Decade&quot; & 2008 Crash)</option>
                    <option value="2008_2018">2008–2018 (Great Recession Recovery)</option>
                    <option value="2015_2025">2015–2024 (Modern Volatility & Tech Rally)</option>
                    <option value="all_25_years">Full 25-Year Cycle (2000–2024)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>{currentT.fiaCapLabel}</span>
                    <span className="font-bold text-cyan-400">{(fiaCap * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.06"
                    max="0.14"
                    step="0.005"
                    value={fiaCap}
                    onChange={(e) => setFiaCap(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{currentT.floorGuaranteed}</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Income FIA Allocation (%):</span>
                    <span className="font-bold text-emerald-400">{(incomeAllocationPct * 100).toFixed(0)}% (${incomeDedicatedCapital.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.70"
                    step="0.05"
                    value={incomeAllocationPct}
                    onChange={(e) => setIncomeAllocationPct(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Contractual GLWB Payout Rate:</span>
                    <span className="font-bold text-emerald-400">{(incomePayoutRate * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.08"
                    step="0.0025"
                    value={incomePayoutRate}
                    onChange={(e) => setIncomePayoutRate(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Right Presentation Dashboard (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* TAB: ROTH BLUEPRINT */}
            {activeTab === 'roth' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {lang === 'es' ? 'Estrategia Roth con Calendario de Retiros Libres' : 'Roth Blueprint with Tiered Liquidity Calibration'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      State: <b className="text-cyan-300">{STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</b> • Schedule: <b className="text-emerald-300">{freeWithdrawalSchedule === 'tiered_2_12' ? '2% Yr 1 → 12% Yrs 2–10' : freeWithdrawalSchedule}</b>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded-full">
                    {lang === 'es' ? 'Ahorro Fiscal Total:' : 'Total Lifetime Savings:'} ${taxAnalysis.lifetimeTaxSaved.toLocaleString()}
                  </span>
                </div>

                {/* Tactical Bonus & Net Tax Rate Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> Carrier Bonus
                    </span>
                    <div className="text-xl font-black text-white">+${taxAnalysis.upfrontBonusDollars.toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400">
                      {(carrierBonusPct * 100).toFixed(0)}% added immediately to absorb tax friction.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Gross Bracket Rate
                    </span>
                    <div className="text-xl font-black text-slate-300">{taxAnalysis.grossStatutoryRatePct}%</div>
                    <p className="text-[10px] text-slate-400">
                      Combined Fed + {selectedState} ({(stateTaxRate * 100).toFixed(1)}%) statutory rate.
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-cyan-950/40 to-slate-900 border border-emerald-500/50 rounded-xl space-y-1">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Net Effective Rate
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      {taxAnalysis.overallNetEffectiveTaxRate}%
                    </div>
                    <p className="text-[10px] text-emerald-200/90 font-medium">
                      Net out-of-pocket tax rate after {(carrierBonusPct * 100).toFixed(0)}% carrier bonus credits.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Converted Total
                    </span>
                    <div className="text-xl font-black text-white">${taxAnalysis.totalConversionsExecuted.toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400">
                      Permanently sheltered in tax-free Roth status before age 73.
                    </p>
                  </div>
                </div>

                {/* Multi-Year Taxes Graph */}
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Annual Tax Comparison (Taxes start at retirement age {retirementAge} and escalate at 73 under inaction):
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taxAnalysis.yearlyData}>
                        <XAxis dataKey="age" stroke="#64748b" />
                        <YAxis stroke="#64748b" tickFormatter={(v: number) => `$${v / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Legend />
                        <Bar dataKey="baselineTax" name="Taxes Under Inaction" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="planTax" name="Plan Tax (Covered by Free Withdrawal)" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Annual Conversion Schedule Table with Dynamic Schedule Rates */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex justify-between items-center">
                    <span>Tactical Conversion Runway ({freeWithdrawalSchedule === 'tiered_2_12' ? 'Tiered 2% → 12% Schedule' : 'Standard Schedule'})</span>
                    <span className="text-[11px] text-cyan-400 font-normal">
                      {(carrierBonusPct * 100).toFixed(0)}% Bonus Offset | {selectedState} ({(stateTaxRate * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="py-2">Age (Contract Yr)</th>
                          <th className="py-2">Conversion Amount</th>
                          <th className="py-2">Free Withdrawal Limit</th>
                          <th className="py-2">Taxes Paid from Contract</th>
                          <th className="py-2">Gross Statutory Tax</th>
                          <th className="py-2 text-emerald-400 font-bold">Net Effective Tax</th>
                          <th className="py-2">Tax-Free Roth Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {taxAnalysis.yearlyData.filter(d => d.age < 73).map(d => (
                          <tr key={d.age} className="hover:bg-slate-900/50">
                            <td className="py-2 font-semibold text-white">Age {d.age} (Yr {d.contractYear})</td>
                            <td className="py-2 text-emerald-400 font-bold">${d.conversionAmount.toLocaleString()}</td>
                            <td className="py-2 text-slate-300 font-medium">
                              ${d.maxFreeWithdrawal.toLocaleString()}
                              <span className="text-[10px] text-cyan-400 ml-1">({d.maxFreeWithdrawalRatePct}%)</span>
                            </td>
                            <td className="py-2 text-rose-300 font-medium">${d.taxesPaidFromWithdrawal.toLocaleString()}</td>
                            <td className="py-2 text-slate-400">{d.statutoryRatePct}%</td>
                            <td className="py-2 text-cyan-300 font-bold">
                              {d.netEffectiveRatePct}%
                              <span className="text-[10px] text-emerald-400 ml-1 font-normal">(-{(carrierBonusPct * 100).toFixed(0)}% bonus)</span>
                            </td>
                            <td className="py-2 text-indigo-400 font-bold">${d.planRoth.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DIALOGUE & QUESTIONS CARDS */}
                {showAdvisorNotes && (
                  <div className="mt-4 p-5 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-600/40 rounded-xl space-y-4">
                    <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                      <div className="p-4 bg-slate-950/70 rounded-lg border border-amber-500/20 shadow-sm space-y-2.5">
                        <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                          {lang === 'es'
                            ? `"${firstName}, en el Año 1, el contrato permite un ${taxAnalysis.yearlyData[0]?.maxFreeWithdrawalRatePct}% de retiro libre de penalidad ($${taxAnalysis.yearlyData[0]?.maxFreeWithdrawal.toLocaleString()}) para iniciar de inmediato su conversión a Roth, aumentando al 12% a partir del Año 2. Con el bono inicial del ${(carrierBonusPct * 100).toFixed(0)}%, su tasa neta efectiva es de solo ${taxAnalysis.overallNetEffectiveTaxRate}%. ¿Tiene sentido poner a trabajar este beneficio para proteger su patrimonio para siempre?"`
                            : `"${firstName}, in Year 1, this contract permits a ${taxAnalysis.yearlyData[0]?.maxFreeWithdrawalRatePct}% penalty-free withdrawal ($${taxAnalysis.yearlyData[0]?.maxFreeWithdrawal.toLocaleString()}) to begin immediate Roth conversions, expanding to 12% in Year 2+. Combined with the ${(carrierBonusPct * 100).toFixed(0)}% upfront carrier bonus, your net effective tax rate is only ${taxAnalysis.overallNetEffectiveTaxRate}%. Does it make sense to put this contract liquidity to work immediately?"`
                          }
                        </div>
                        <div className="text-sm md:text-base text-amber-200/90 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                          <span className="text-amber-400 font-bold mr-1">•</span>
                          {lang === 'es'
                            ? `"Pagar impuestos ahora no es un gasto; es comprar un dólar libre de impuestos por un descuento significativo. El bono de la aseguradora absorbe el costo para que sus herederos reciban el 100% libre de impuestos bajo la ley SECURE."`
                            : `"Paying taxes now isn't an expense; it's buying a future tax-free dollar at a major discount. The carrier's upfront bonus absorbs the friction so your children inherit 100% tax-free wealth under the SECURE Act."`
                          }
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/70 rounded-lg border border-amber-500/20 shadow-sm space-y-2.5">
                        <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                          {lang === 'es'
                            ? `"${firstName}, ya que limitamos la conversión de cada año para que los impuestos queden completamente cubiertos por el retiro libre de penalidades contractuales, ¿qué tranquilidad le da saber que no tendrá que pagarle al IRS de su propio bolsillo?"`
                            : `"${firstName}, since we calibrate each year's conversion so the taxes are fully covered by your contractual penalty-free withdrawal, how does it feel knowing you won't have to write a check out of pocket to the IRS?"`
                          }
                        </div>
                        <div className="text-sm md:text-base text-amber-200/90 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                          <span className="text-amber-400 font-bold mr-1">•</span>
                          {lang === 'es'
                            ? `"Nunca tocamos su liquidez de emergencia. El propio contrato financia la factura del IRS utilizando la provisión de retiro anual libre de penalidades."`
                            : `"We never compromise your emergency cash reserves. The annuity contract itself finances the tax bill using its penalty-free annual liquidity provision."`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: STORY MODE */}
            {activeTab === 'story' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {storyStep === 1 && <span className="text-rose-400 flex items-center gap-1.5"><ShieldAlert className="w-5 h-5" /> {currentT.act1Title}</span>}
                    {storyStep === 2 && <span className="text-emerald-400 flex items-center gap-1.5"><Award className="w-5 h-5" /> {currentT.act2Title}</span>}
                    {storyStep === 3 && <span className="text-cyan-400 flex items-center gap-1.5"><ShieldCheck className="w-5 h-5" /> {currentT.act3Title}</span>}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setStoryStep(1)} className={`px-3 py-1 rounded text-xs font-semibold ${storyStep === 1 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{currentT.btnTrap}</button>
                    <button onClick={() => setStoryStep(2)} className={`px-3 py-1 rounded text-xs font-semibold ${storyStep === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{currentT.btnSolution}</button>
                    <button onClick={() => setStoryStep(3)} className={`px-3 py-1 rounded text-xs font-semibold ${storyStep === 3 ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{currentT.btnShield}</button>
                  </div>
                </div>

                {storyStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentT.estIrsCheck}</span>
                        <div className="text-2xl font-black text-rose-500">${taxAnalysis.totalBaselineTax.toLocaleString()}</div>
                        <p className="text-[11px] text-slate-400">{currentT.estIrsCheckDesc}</p>
                      </div>
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentT.forcedRmdAge}</span>
                        <div className="text-2xl font-black text-white">{lang === 'es' ? '73 Años' : 'Age 73'}</div>
                        <p className="text-[11px] text-slate-400">{currentT.forcedRmdDesc}</p>
                      </div>
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentT.ssTorpedo}</span>
                        <div className="text-2xl font-black text-amber-400">{lang === 'es' ? 'Hasta 85%' : 'Up to 85%'}</div>
                        <p className="text-[11px] text-slate-400">{currentT.ssTorpedoDesc}</p>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-300 mb-2">{currentT.inactionChartTitle}</div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={taxAnalysis.yearlyData}>
                            <XAxis dataKey="age" stroke="#64748b" />
                            <YAxis stroke="#64748b" tickFormatter={(v: number) => `$${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                            <Bar dataKey="baselineTax" name={lang === 'es' ? 'Impuestos Obligatorios' : 'Forced Tax Liability'} fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <button onClick={() => setStoryStep(2)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                      {currentT.btnGoToAct2} <ChevronRight className="w-4 h-4" />
                    </button>

                    {showAdvisorNotes && (
                      <div className="mt-4 p-5 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-600/40 rounded-xl space-y-4">
                        <div className="space-y-4 text-base md:text-lg text-amber-100 font-medium leading-relaxed">
                          <div className="p-4 bg-slate-950/70 rounded-lg border border-amber-500/20 shadow-sm space-y-2.5">
                            <div className="text-base md:text-lg text-amber-100 font-semibold leading-relaxed">
                              {lang === 'es'
                                ? `"${firstName}, ¿qué sucedería si sus retiros de jubilación a partir de los ${retirementAge} años lo empujan a un tramo impositivo más alto de lo planeado, seguido por las RMD obligatorias a los 73 años? ¿Cómo impactaría esto su estilo de vida?"`
                                : `"${firstName}, what would happen if your retirement withdrawals starting at age ${retirementAge} push you into a higher tax bracket than expected, followed by compulsory RMDs at 73—how would that affect your lifestyle?"`
                              }
                            </div>
                            <div className="text-sm md:text-base text-amber-200/90 border-t border-slate-800 pt-2 font-normal leading-relaxed">
                              <span className="text-amber-400 font-bold mr-1">•</span>
                              {lang === 'es'
                                ? `"Los jubilados no le temen tanto a las caídas del mercado como a perder el control sobre sus ingresos. Las RMD le otorgan al IRS el control total de su factura fiscal."`
                                : `"Retirees don't fear market crashes as much as they fear losing control over their income. RMDs give the IRS total control over your tax bill."`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {storyStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">{currentT.lifetimeSavingsLabel}</span>
                        <div className="text-3xl font-black text-emerald-400">${taxAnalysis.lifetimeTaxSaved.toLocaleString()}</div>
                        <p className="text-[11px] text-slate-300">{currentT.lifetimeSavingsDesc}</p>
                      </div>
                      <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl space-y-1">
                        <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">{currentT.heirsShield}</span>
                        <div className="text-3xl font-black text-indigo-400">${taxAnalysis.heirSavings.toLocaleString()}</div>
                        <p className="text-[11px] text-slate-300">{currentT.heirShieldDesc}</p>
                      </div>
                    </div>

                    <button onClick={() => setStoryStep(3)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                      {currentT.btnGoToAct3} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {storyStep === 3 && (
                  <div className="space-y-6">
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                          <Compass className="w-4 h-4 text-emerald-400" /> Paychecks &amp; Playchecks Framework
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                          MATH &amp; SCIENCE DRIVEN
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2">
                          <div className="text-xs font-bold text-emerald-400 uppercase">Bucket 1: Guaranteed Paychecks (Life Essentials)</div>
                          <div className="text-2xl font-black text-white">${guaranteedFiaIncome.toLocaleString()} / Year</div>
                          <ul className="text-xs text-slate-300 space-y-1.5">
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Contractually guaranteed for life via Income FIA</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Covers food, utilities, health insurance, and property taxes</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Completely neutralizes Sequence-of-Returns Risk</li>
                          </ul>
                        </div>

                        <div className="p-4 bg-sky-950/20 border border-sky-500/30 rounded-lg space-y-2">
                          <div className="text-xs font-bold text-sky-400 uppercase">Bucket 2: Playchecks &amp; Growth (Freedom &amp; Family)</div>
                          <div className="text-2xl font-black text-white">${(iraBalance - incomeDedicatedCapital).toLocaleString()} Invested</div>
                          <ul className="text-xs text-slate-300 space-y-1.5">
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-400 shrink-0" /> 100% invested in equities for aggressive growth</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-400 shrink-0" /> Never forced to liquidate depressed stocks in a crash</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-400 shrink-0" /> Funds travel, grandchildren, and family legacy</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => setActiveTab('summary')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2">
                      {currentT.btnGoToSummary} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: GFILOGIX BACKTEST */}
            {activeTab === 'backtest' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{currentT.backtestHeading}</h3>
                    <p className="text-xs text-slate-400">{currentT.backtestSubheading}</p>
                  </div>

                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 text-[11px]">
                    <button
                      onClick={() => setBacktestMode('income_fia_vs_portfolio')}
                      className={`px-3 py-1 rounded font-semibold transition ${
                        backtestMode === 'income_fia_vs_portfolio' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {currentT.modeIncomeFia}
                    </button>
                    <button
                      onClick={() => setBacktestMode('equity_vs_fia')}
                      className={`px-3 py-1 rounded font-semibold transition ${
                        backtestMode === 'equity_vs_fia' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {currentT.modeEqVsFia}
                    </button>
                    <button
                      onClick={() => setBacktestMode('fixed_vs_fia')}
                      className={`px-3 py-1 rounded font-semibold transition ${
                        backtestMode === 'fixed_vs_fia' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {currentT.modeFixedVsFia}
                    </button>
                  </div>
                </div>

                {/* Scenario Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setBacktestPeriod('2000_2010')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2000_2010' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>2000–2010</div>
                    <div className="text-[10px] font-normal opacity-75">Dot-Com + 2008</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('2008_2018')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2008_2018' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>2008–2018</div>
                    <div className="text-[10px] font-normal opacity-75">Great Recession</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('2015_2025')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === '2015_2025' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>2015–2024</div>
                    <div className="text-[10px] font-normal opacity-75">Modern Volatility</div>
                  </button>
                  <button
                    onClick={() => setBacktestPeriod('all_25_years')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      backtestPeriod === 'all_25_years' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>2000–2024</div>
                    <div className="text-[10px] font-normal opacity-75">Full 25-Year Cycle</div>
                  </button>
                </div>

                {backtestMode === 'income_fia_vs_portfolio' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                          <Wallet className="w-4 h-4" /> {currentT.incomeSpreadTitle}
                        </div>
                        <div className="text-2xl font-black text-white">
                          ${guaranteedFiaIncome.toLocaleString()}/yr
                          <span className="text-xs text-emerald-400 ml-2 font-normal">
                            (+${annualIncomeAdvantage.toLocaleString()}/yr vs. 4% rule)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{currentT.incomeSpreadDesc}</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/40">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
                          <Landmark className="w-4 h-4" /> {currentT.capitalEfficiencyTitle}
                        </div>
                        <div className="text-2xl font-black text-cyan-300">
                          +${liberatedCapitalForGrowth.toLocaleString()} Liberated
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{currentT.capitalEfficiencyDesc}</p>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-300 mb-2">{currentT.paycheckChartTitle}</div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={incomePaycheckComparison}>
                            <XAxis dataKey="calendarYear" stroke="#64748b" />
                            <YAxis stroke="#64748b" tickFormatter={(v: number) => `$${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                            <Legend />
                            <Bar dataKey="traditional6040Paycheck" name="Traditional 4% Paycheck (Drops in Bear Markets)" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="guaranteedFiaPaycheck" name="Guaranteed Life Paycheck (Contractual Floor)" fill="#10b981" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUMMARY LEDGER */}
            {activeTab === 'summary' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 print:border-none print:p-0">
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Global Financial Impact" className="h-12 w-auto object-contain" />
                    <div>
                      <h1 className="text-xl font-bold text-slate-900">{currentT.summaryTitle}</h1>
                      <p className="text-xs text-gray-600">{currentT.practiceName}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div><b>{currentT.preparedFor}</b> {clientName}</div>
                    <div><b>State:</b> {STATE_TAX_RATES[selectedState]?.name} ({(stateTaxRate * 100).toFixed(1)}%)</div>
                    <div><b>Target Retirement:</b> Age {retirementAge}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 print:text-black">
                        <th className="py-2.5">{currentT.tableDim}</th>
                        <th className="py-2.5">{currentT.tableCurrent}</th>
                        <th className="py-2.5">{currentT.tablePlan}</th>
                        <th className="py-2.5 text-right">{currentT.tableAdv}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200 print:text-black">
                      <tr>
                        <td className="py-3 font-semibold">{currentT.row1}</td>
                        <td>${taxAnalysis.totalBaselineTax.toLocaleString()}</td>
                        <td className="text-emerald-400 font-bold print:text-black">${taxAnalysis.totalPlanTax.toLocaleString()}</td>
                        <td className="text-right text-emerald-400 font-bold print:text-black">+${taxAnalysis.lifetimeTaxSaved.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">State of Residence Tax Impact</td>
                        <td>{STATE_TAX_RATES[selectedState]?.name}</td>
                        <td className="text-cyan-400 font-bold print:text-black">{(stateTaxRate * 100).toFixed(1)}% Tax</td>
                        <td className="text-right text-cyan-400 font-bold print:text-black">Calibrated</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Carrier Premium Bonus Offset</td>
                        <td>$0 (None)</td>
                        <td className="text-cyan-400 font-bold print:text-black">+${taxAnalysis.upfrontBonusDollars.toLocaleString()}</td>
                        <td className="text-right text-cyan-400 font-bold print:text-black">
                          {(carrierBonusPct * 100).toFixed(0)}% Bonus
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Net Effective Conversion Tax Rate</td>
                        <td>{taxAnalysis.grossStatutoryRatePct}% (Statutory)</td>
                        <td className="text-emerald-400 font-bold print:text-black">{taxAnalysis.overallNetEffectiveTaxRate}%</td>
                        <td className="text-right text-emerald-400 font-bold print:text-black">
                          -{(carrierBonusPct * 100).toFixed(0)}% Net Discount
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">{currentT.row2}</td>
                        <td>$0</td>
                        <td className="text-indigo-400 font-bold print:text-black">${taxAnalysis.totalRmdAvoided.toLocaleString()}</td>
                        <td className="text-right text-indigo-400 font-bold print:text-black">Sheltered</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">{currentT.row3}</td>
                        <td>${(taxAnalysis.terminalWealthBase * heirsTaxRate).toLocaleString()}</td>
                        <td className="text-indigo-400 font-bold print:text-black">$0 (Roth)</td>
                        <td className="text-right text-indigo-400 font-bold print:text-black">+${taxAnalysis.heirSavings.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">{currentT.row4}</td>
                        <td>${traditional4PctIncome.toLocaleString()}/yr (Subject to market swings)</td>
                        <td className="text-emerald-400 font-bold print:text-black">${guaranteedFiaIncome.toLocaleString()}/yr</td>
                        <td className="text-right text-emerald-400 font-bold print:text-black">+${annualIncomeAdvantage.toLocaleString()}/yr Floor</td>
                      </tr>
                      <tr className="bg-indigo-950/40 print:bg-gray-100 font-bold text-sm">
                        <td className="py-3.5 text-white print:text-black">{currentT.rowTotal}</td>
                        <td>--</td>
                        <td>--</td>
                        <td className="text-right text-emerald-400 print:text-black">
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
        <footer className="mt-12 pt-6 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-3 print:text-black print:border-slate-400">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-300 print:text-black">
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

          <p className="text-[10px] text-slate-500 print:text-gray-600">
            © 2026 Global Financial Impact (GFI). All rights reserved. Calculations are generated via mathematical simulation models and do not constitute a formal insurance illustration or prospectus. For official contract values, obtain a carrier-approved product illustration from a properly appointed, state-licensed insurance producer.
          </p>
        </footer>

      </div>
    </main>
  );
}