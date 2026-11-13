'use client';

import React, { useState } from 'react';

interface IllustrationComparisonProps {
  iraBalance: number;
  withdrawalNeed: number;
  socialSecurity: number;
  fixedIncome: number;
}

export default function IllustrationComparison({
  iraBalance,
  withdrawalNeed,
  socialSecurity,
  fixedIncome,
}: IllustrationComparisonProps) {
  const [illustrationData, setIllustrationData] = useState<any>(null);
  const [isParsingIllustration, setIsParsingIllustration] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [currentAccountType, setCurrentAccountType] = useState<'PORTFOLIO' | 'CD' | 'MYGA'>('PORTFOLIO');
  const [currentCdOrAccountRate, setCurrentCdOrAccountRate] = useState<number>(4.25);
  const [stockAllocationPercent, setStockAllocationPercent] = useState<number>(60);
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState<number>(4.0);

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingIllustration(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string)?.split(',')[1];
        if (!base64) throw new Error('Could not read file');

        const res = await fetch('/api/parse-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            mimeType: file.type || 'application/pdf',
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Illustration parse failed');
        setIllustrationData(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to read illustration PDF');
      } finally {
        setIsParsingIllustration(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-wider text-emerald-400 uppercase">
            Carrier Illustration vs. Current Allocation / CD / MYGA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare capital locked up at a 4%–5% withdrawal rate or CD/MYGA yield vs. generating the same income with less capital
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <select
              value={currentAccountType}
              onChange={(e) => setCurrentAccountType(e.target.value as 'PORTFOLIO' | 'CD' | 'MYGA')}
              className="bg-transparent text-xs font-semibold text-amber-300 focus:outline-none"
            >
              <option value="PORTFOLIO" className="bg-slate-900">401(k)/IRA Mix</option>
              <option value="CD" className="bg-slate-900">Current CD</option>
              <option value="MYGA" className="bg-slate-900">Current MYGA</option>
            </select>

            {currentAccountType === 'PORTFOLIO' ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-200">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={stockAllocationPercent}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                    setStockAllocationPercent(val);
                  }}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-slate-100 focus:border-emerald-400 focus:outline-none"
                  title="Stocks percentage"
                />
                <span className="text-[11px] text-slate-400">% Stocks /</span>
                <span className="text-[11px] font-semibold text-sky-300">{100 - stockAllocationPercent}% Bonds</span>
                <span className="text-slate-600">|</span>
                <span className="text-[11px] text-slate-400">Withdrawal:</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Math.max(0.5, Number(e.target.value) || 4))}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-amber-300 font-semibold focus:border-emerald-400 focus:outline-none"
                  title="Safe withdrawal rate % (e.g., 4 or 5)"
                />
                <span className="text-[11px] text-slate-400">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.05"
                  value={currentCdOrAccountRate}
                  onChange={(e) => setCurrentCdOrAccountRate(Number(e.target.value) || 0)}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            )}
          </div>

          <label className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">
            {isParsingIllustration ? 'Reading Illustration...' : 'Upload Illustration PDF'}
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleIllustrationUpload}
              disabled={isParsingIllustration}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {illustrationData && (() => {
        const basePrincipal = Number(illustrationData.initialPremium) || Number(iraBalance) || 0;
        const bondAllocationPercent = 100 - stockAllocationPercent;

        const effectiveCurrentRate =
          currentAccountType === 'PORTFOLIO'
            ? Number(((stockAllocationPercent * 0.08 + bondAllocationPercent * 0.04) * 100).toFixed(2))
            : currentCdOrAccountRate;

        const currentAnnualReturn = Math.round(basePrincipal * (effectiveCurrentRate / 100));
        const currentMonthlyEst =
          currentAccountType === 'PORTFOLIO'
            ? Math.round((basePrincipal * (safeWithdrawalRate / 100)) / 12)
            : Math.round(currentAnnualReturn / 12);

        const estimatedDownsideLoss =
          currentAccountType === 'PORTFOLIO'
            ? Math.round(
                basePrincipal * (stockAllocationPercent / 100) * 0.35 +
                  basePrincipal * (bondAllocationPercent / 100) * 0.08
              )
            : 0;

        const illusRate =
          Number(illustrationData.illustratedRatePercent) ||
          Number(illustrationData.guaranteedRatePercent) ||
          0;
        const bonusMultiplier = 1 + (Number(illustrationData.bonusPercent) || 0) / 100;
        const illusMonthly =
          Number(illustrationData.illustratedMonthlyIncome) ||
          Number(illustrationData.guaranteedMonthlyIncome) ||
          Math.round((basePrincipal * bonusMultiplier * (illusRate / 100)) / 12);
        const monthlyDiff = illusMonthly - currentMonthlyEst;

        const clientGap = Math.max(
          0,
          Number(withdrawalNeed || 0) - Number(socialSecurity || 0) - Number(fixedIncome || 0)
        );
        const targetMonthlyIncome = clientGap > 0 ? clientGap : illusMonthly;
        const targetAnnualIncome = targetMonthlyIncome * 12;

        const effectivePayoutRate =
          basePrincipal > 0 && illusMonthly > 0
            ? (illusMonthly * 12) / basePrincipal
            : illusRate > 0
            ? (illusRate / 100) * bonusMultiplier
            : 0.065;

        const currentRateForCapital =
          currentAccountType === 'PORTFOLIO'
            ? safeWithdrawalRate / 100
            : Math.max(0.01, currentCdOrAccountRate / 100);

        const capitalLockedCurrent =
          targetAnnualIncome > 0 ? Math.round(targetAnnualIncome / currentRateForCapital) : basePrincipal;
        const capitalNeededAnnuity =
          targetAnnualIncome > 0 && effectivePayoutRate > 0
            ? Math.round(targetAnnualIncome / effectivePayoutRate)
            : basePrincipal;
        const capitalFreedUp = capitalLockedCurrent - capitalNeededAnnuity;

        return (
          <div className="mt-4 rounded-lg bg-slate-950/90 border border-emerald-500/30 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-sm font-bold text-slate-100">
                  {illustrationData.carrierName || 'Carrier'} —{' '}
                  {illustrationData.productName || 'Proposed Illustration'}
                </span>
                {illustrationData.keyHighlights && (
                  <p className="text-xs text-slate-400 mt-0.5">{illustrationData.keyHighlights}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIllustrationData(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Metric</div>
                <div className="mt-2 space-y-2 font-medium text-slate-300">
                  <div>Illustration Deposit</div>
                  <div>
                    {currentAccountType === 'PORTFOLIO'
                      ? `Monthly Income (@ ${safeWithdrawalRate}%)`
                      : 'Est. Monthly Interest'}
                  </div>
                  <div className="text-amber-300 font-semibold">
                    Capital Locked Up for ${targetMonthlyIncome.toLocaleString()}/mo
                  </div>
                  <div>Downside / Renewal Risk</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                  {currentAccountType === 'PORTFOLIO'
                    ? `Current ${stockAllocationPercent}/${bondAllocationPercent} (@ ${safeWithdrawalRate}% WD)`
                    : `Current ${currentAccountType} (${currentCdOrAccountRate}%)`}
                </div>
                <div className="mt-2 space-y-2 text-slate-200">
                  <div>${basePrincipal.toLocaleString()}</div>
                  <div>${currentMonthlyEst.toLocaleString()}/mo</div>
                  <div className="font-bold text-rose-300">
                    ${capitalLockedCurrent.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-slate-400">locked up</span>
                  </div>
                  <div
                    className={
                      currentAccountType === 'PORTFOLIO' ? 'text-rose-400 font-semibold' : 'text-slate-300'
                    }
                  >
                    {currentAccountType === 'PORTFOLIO'
                      ? `-$${estimatedDownsideLoss.toLocaleString()} Stress Drawdown`
                      : currentAccountType === 'CD'
                      ? '1099 Taxed · Renewal Risk'
                      : 'Rate Reset Risk at Maturity'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                  Proposed Income Strategy
                </div>
                <div className="mt-2 space-y-2 text-emerald-100 font-medium">
                  <div>${basePrincipal.toLocaleString()}</div>
                  <div>
                    ${illusMonthly.toLocaleString()}/mo
                    {monthlyDiff > 0 && (
                      <span className="ml-1.5 text-[11px] text-emerald-400">
                        (+${monthlyDiff.toLocaleString()}/mo)
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-emerald-300">
                    ${capitalNeededAnnuity.toLocaleString()}
                    {capitalFreedUp > 0 && (
                      <span className="ml-1.5 text-[11px] text-emerald-400">
                        (Frees up ${capitalFreedUp.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div className="text-emerald-300 font-semibold">$0 Market Loss (100% Protected)</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
