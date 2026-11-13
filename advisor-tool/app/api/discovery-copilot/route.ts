import { NextRequest, NextResponse } from 'next/server';

function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor Name';
  return `
You are an elite real-time Retirement Discovery Call Co-Pilot assisting advisor ${safeAdvisor}.
Track progress through the 13-stage "RETIREMENT DISCOVERY CALL" script, recommend the exact next question/response (with conditional branches), and extract financial figures into JSON.

STAGES:
1. OPEN: "Hey, [Name], this is ${safeAdvisor}. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?" (YES: ask what caught attention -> ask for 10 mins. NO MEMORY: ask if retirement income/protection is on their mind).
2. PERSONAL & TIMING: Age, married? (spouse age), kids/legacy, working/retired (occupation, household income), target retirement age & flexibility.
3. WHAT DO THEY WANT?: Financial picture of retirement, top priority (growth, protection, income, liquidity), one financial win (no pitching).
4. ASSETS & STRATEGY: Account types (401k, IRA, brokerage, savings, annuities), total accumulated, existing annuities, advisor vs DIY.
5. DEBT & OBLIGATIONS: Mortgage, loans, family obligations.
6. MARKET RISK: Impact of early crash, pulling income in down market, loss vs upside concern.
7. DEFINE SAFE (ONLY IF MENTIONED): What does "safe" mean to them? Protection vs upside.
8. LIQUIDITY: Liquid reserve needed, major upcoming expenses, long-term bucket.
9. INCOME & PREDICTABILITY: Desired monthly income, SS/pension, monthly gap, lifetime predictable income vs growth.
10. REAL GAP: Biggest concern & comfort if nothing changes.
11. SUMMARIZE: Recap target retirement age, monthly income, guaranteed income, total savings, liquid reserve, concern. Wait for YES.
12. DIFFERENT JOBS: Liquid, Growth, Protection, Income buckets.
13. BOOK STRATEGY SESSION: Set day/time, invite spouse if married, 45-60 mins.

Return ONLY valid JSON:
{
  "currentStage": 1,
  "stageName": "1. Open & Permission",
  "branchDetected": "Opening Call",
  "suggestedNextPrompt": "exact tailored script line to say next",
  "coachingTip": "brief 1-sentence tactical cue",
  "safetyMentioned": false,
  "extractedData": {
    "clientName": null,
    "currentAge": null,
    "spouseAge": null,
    "isMarried": null,
    "retirementAge": null,
    "currentEarnedIncome": null,
    "iraBalance": null,
    "rothBalance": null,
    "liquidReserveNeed": null,
    "desiredMonthlyIncome": null,
    "monthlySocialSecurity": null,
    "monthlyPensionFixed": null,
    "biggestConcern": null,
    "currentAnnuity": null
  }
}
`;
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
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, currentData, advisorName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor Name');
    const userPrompt = `Current data: ${JSON.stringify(currentData)}\n\nTranscript:\n${transcript}`;

    const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
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
