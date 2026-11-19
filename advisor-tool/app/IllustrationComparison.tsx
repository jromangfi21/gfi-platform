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
  const [taxBracketPercent, setTaxBracketPercent] = useState<number>(22);
  const [splitBucketMode, setSplitBucketMode] = useState<boolean>(true);

  const renderPdfSummaryPages = async (file: File): Promise<string[]> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 5);
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64 = dataUrl.split(',')[1];
      if (base64) pages.push(base64);
    }
    return pages;
  };

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingIllustration(true);
    setErrorMsg('');

    try {
      let payload: Record<string, any> = { fileName: file.name };

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pagesBase64 = await renderPdfSummaryPages(file);
        if (!pagesBase64.length) throw new Error('Could not render PDF pages');
        payload.pagesBase64 = pagesBase64;
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string)?.split(',')[1] || '');
          reader.onerror = () => reject(new Error('Could not read image'));
          reader.readAsDataURL(file);
        });
        payload.fileBase64 = base64;
        payload.mimeType = file.type || 'image/jpeg';
      }

      const res = await fetch('/api/parse-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (!res.ok) throw new Error(data.error || 'Illustration parse failed');
      setIllustrationData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read illustration');
    } finally {
      setIsParsingIllustration(false);
      e.target.value = '';
    }
  };

  const updateIllusField = (field: string, value: any) => {
    setIllustrationData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-wider text-emerald-400 uppercase">
            Carrier Illustration vs. Current Allocation / CD / MYGA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare capital locked up at a 4%–5% withdrawal rate, after-tax CD/MYGA drag, and split-bucket growth freedom
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
                  onChange={(e) => setStockAllocationPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">% Stocks /</span>
                <span className="text-[11px] font-semibold text-sky-300">{100 - stockAllocationPercent}% Bonds</span>
                <span className="text-slate-600">|</span>
                <span className="text-[11px] text-slate-400">WD:</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Math.max(0.5, Number(e.target.value) || 4))}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-amber-300 font-semibold focus:border-emerald-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.05"
                  value={currentCdOrAccountRate}
                  onChange={(e) => setCurrentCdOrAccountRate(Number(e.target.value) || 0)}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
                {currentAccountType === 'CD' && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-[11px] text-slate-400">Tax:</span>
                    <select
                      value={taxBracketPercent}
                      onChange={(e) => setTaxBracketPercent(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-rose-300 focus:outline-none"
                    >
                      <option value={0}>0%</option>
                      <option value={12}>12%</option>
                      <option value={22}>22%</option>
                      <option value={24}>24%</option>
                      <option value={32}>32%</option>
                    </select>
                  </>
                )}
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
        const totalNestEgg = Number(iraBalance) || Number(illustrationData.initialPremium) || 0;
        const basePrincipal = Number(illustrationData.initialPremium) || totalNestEgg;
        const bondAllocationPercent = 100 - stockAllocationPercent;

        const grossRate =
          currentAccountType === 'PORTFOLIO'
            ? Number(((stockAllocationPercent * 0.08 + bondAllocationPercent * 0.04) * 100).toFixed(2))
            : currentCdOrAccountRate;

        const effectiveAfterTaxRate =
          currentAccountType === 'CD'
            ? Number((grossRate * (1 - taxBracketPercent / 100)).toFixed(2))
            : grossRate;

        const currentMonthlyEst =
          currentAccountType === 'PORTFOLIO'
            ? Math.round((basePrincipal * (safeWithdrawalRate / 100)) / 12)
            : Math.round((basePrincipal * (effectiveAfterTaxRate / 100)) / 12);

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
            : Math.max(0.01, effectiveAfterTaxRate / 100);

        const capitalLockedCurrent =
          targetAnnualIncome > 0 ? Math.round(targetAnnualIncome / currentRateForCapital) : basePrincipal;
        const capitalNeededAnnuity =
          targetAnnualIncome > 0 && effectivePayoutRate > 0
            ? Math.round(targetAnnualIncome / effectivePayoutRate)
            : basePrincipal;
        const capitalFreedUp = capitalLockedCurrent - capitalNeededAnnuity;
        const leftoverGrowthBucket = Math.max(0, totalNestEgg - capitalNeededAnnuity);

        return (
          <div className="mt-4 rounded-lg bg-slate-950/90 border border-emerald-500/30 p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-sm font-bold text-slate-100">
                  {illustrationData.carrierName || 'Carrier'} —{' '}
                  {illustrationData.productName || 'Proposed Illustration'}
                </span>
                {illustrationData.keyHighlights && (
                  <p className="text-xs text-slate-400 mt-0.5">{illustrationData.keyHighlights}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                  <span>Deposit: $</span>
                  <input
                    type="number"
                    value={basePrincipal}
                    onChange={(e) => updateIllusField('initialPremium', Number(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-1 text-right text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                  <span>Monthly Income: $</span>
                  <input
                    type="number"
                    value={illusMonthly}
                    onChange={(e) => updateIllusField('illustratedMonthlyIncome', Number(e.target.value) || 0)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1 text-right text-emerald-300 font-semibold"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSplitBucketMode(!splitBucketMode)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition ${
                    splitBucketMode
                      ? 'bg-sky-950/60 border-sky-500/50 text-sky-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {splitBucketMode ? 'Split-Bucket View: ON' : 'Split-Bucket View: OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setIllustrationData(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Metric</div>
                <div className="mt-2 space-y-2 font-medium text-slate-300">
                  <div>Analyzed Deposit</div>
                  <div>
                    {currentAccountType === 'PORTFOLIO'
                      ? `Monthly Income (@ ${safeWithdrawalRate}% WD)`
                      : currentAccountType === 'CD'
                      ? `After-Tax Monthly (${effectiveAfterTaxRate}% Net)`
                      : 'Est. Monthly Interest'}
                  </div>
                  <div className="text-amber-300 font-semibold">
                    Capital Locked Up for ${targetMonthlyIncome.toLocaleString()}/mo
                  </div>
                  {splitBucketMode && totalNestEgg > 0 && (
                    <div className="text-sky-300 font-semibold">Unencumbered Growth Bucket</div>
                  )}
                  <div>Downside / Renewal Risk</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                  {currentAccountType === 'PORTFOLIO'
                    ? `Current ${stockAllocationPercent}/${bondAllocationPercent} (@ ${safeWithdrawalRate}% WD)`
                    : currentAccountType === 'CD'
                    ? `Current CD (${currentCdOrAccountRate}% Gross / ${taxBracketPercent}% Tax)`
                    : `Current MYGA (${currentCdOrAccountRate}%)`}
                </div>
                <div className="mt-2 space-y-2 text-slate-200">
                  <div>${basePrincipal.toLocaleString()}</div>
                  <div>${currentMonthlyEst.toLocaleString()}/mo</div>
                  <div className="font-bold text-rose-300">
                    ${capitalLockedCurrent.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-slate-400">locked up</span>
                  </div>
                  {splitBucketMode && totalNestEgg > 0 && (
                    <div className="text-slate-400">
                      ${Math.max(0, totalNestEgg - capitalLockedCurrent).toLocaleString()} left unencumbered
                    </div>
                  )}
                  <div
                    className={
                      currentAccountType === 'PORTFOLIO' ? 'text-rose-400 font-semibold' : 'text-slate-300'
                    }
                  >
                    {currentAccountType === 'PORTFOLIO'
                      ? `-$${estimatedDownsideLoss.toLocaleString()} Stress Drawdown`
                      : currentAccountType === 'CD'
                      ? `-${taxBracketPercent}% Annual 1099 Tax Drag`
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
                  {splitBucketMode && totalNestEgg > 0 && (
                    <div className="font-semibold text-sky-300">
                      ${leftoverGrowthBucket.toLocaleString()} free to invest/grow
                    </div>
                  )}
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
