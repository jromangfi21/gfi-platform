import { NextRequest, NextResponse } from 'next/server';

function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor Name';
  return `You are a fast real-time Retirement Discovery Call Co-Pilot for advisor ${safeAdvisor}.
Track the 13-stage script, return the exact next tailored question/response, and extract financial numbers into JSON.

STAGES:
1. OPEN: Confirm info request -> ask for 10 mins (or ask if retirement income/protection is on their mind).
2. PERSONAL: Age, married? (spouse age), kids/legacy, working/retired (occupation, household income), retirement age.
3. GOALS: Financial picture of retirement, top priority (growth, protection, income, liquidity), one financial win.
4. ASSETS: 401k/IRA/Roth/brokerage/annuities, total saved, existing annuities, advisor vs DIY.
5. DEBT: Mortgage, loans, obligations.
6. RISK: Early crash impact, down-market withdrawals, loss vs upside.
7. SAFE (if mentioned): Define "safe", protection vs upside.
8. LIQUIDITY: Cash reserve needed, major upcoming expenses, long-term bucket.
9. INCOME: Desired monthly income, SS/pension, income gap, predictable lifetime income vs growth.
10. GAP: Biggest concern & comfort if nothing changes.
11. SUMMARIZE: Recap retirement age, monthly income, guaranteed income, total savings, liquid reserve, concern.
12. JOBS: Liquid, Growth, Protection, Income buckets.
13. BOOK: Set 45-60 min Strategy Session day/time, invite spouse if married.

Return ONLY valid JSON:
{"currentStage":1,"stageName":"1. Open & Permission","branchDetected":"Opening Call","suggestedNextPrompt":"exact next line","coachingTip":"brief cue","safetyMentioned":false,"extractedData":{"clientName":null,"currentAge":null,"spouseAge":null,"isMarried":null,"retirementAge":null,"currentEarnedIncome":null,"iraBalance":null,"rothBalance":null,"liquidReserveNeed":null,"desiredMonthlyIncome":null,"monthlySocialSecurity":null,"monthlyPensionFixed":null,"biggestConcern":null,"currentAnnuity":null}}`;
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, advisorName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor Name');
    const userPrompt = `Call Transcript:\n${transcript}`;

    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let response: Response | null = null;
    let lastError = 'Gemini API request failed';

    for (const model of models) {
      try {
        const res = await callGemini(model, apiKey, systemPrompt, userPrompt);
        if (res.ok) {
          response = res;
          break;
        }
        const errData = await res.json().catch(() => ({}));
        lastError = errData?.error?.message || `${model} failed (${res.status})`;
      } catch (e: any) {
        lastError = `${model}: ${e.message}`;
      }
    }

    if (!response) {
      return NextResponse.json({ error: lastError }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawText);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Co-Pilot analysis failed' },
      { status: 500 }
    );
  }
}
