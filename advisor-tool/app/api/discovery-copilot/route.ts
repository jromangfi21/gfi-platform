import { NextRequest, NextResponse } from 'next/server';

function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor Name';
  return `Fast Retirement Discovery Co-Pilot for ${safeAdvisor}. Return ONLY compact JSON:
{"currentStage":1,"branchDetected":"Stage","suggestedNextPrompt":"exact short line","coachingTip":"4-word cue","safetyMentioned":false,"extractedData":{"clientName":null,"currentAge":null,"spouseAge":null,"isMarried":null,"retirementAge":null,"currentEarnedIncome":null,"iraBalance":null,"rothBalance":null,"liquidReserveNeed":null,"desiredMonthlyIncome":null,"monthlySocialSecurity":null,"monthlyPensionFixed":null,"biggestConcern":null,"currentAnnuity":null}}
Stages: 1:Open(10m) 2:Personal(age,spouse,work,retireAge) 3:Goals 4:Assets(401k/IRA/Roth/annuity) 5:Debt 6:Risk 7:Safe 8:Liquidity 9:Income(goal,SS,pension) 10:Gap 11:Recap 12:4Jobs 13:Book45m.`;
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, any> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 200,
      responseMimeType: 'application/json',
    },
  };

  if (model.includes('3.8')) {
    body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, advisorName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const recentTranscript = (transcript || '').slice(-800);
    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor Name');
    const userPrompt = `Transcript:\n${recentTranscript}`;

    // Use lite model first to preserve RPM quota; only fall back if unavailable
    let res = await callGemini('gemini-3.5-flash-lite', apiKey, systemPrompt, userPrompt);
    if (!res.ok && res.status !== 429) {
      res = await callGemini('gemini-3.8-flash', apiKey, systemPrompt, userPrompt);
    }

    if (res.status === 429) {
      return NextResponse.json({ rateLimited: true }, { status: 200 });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || `Gemini API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Co-Pilot analysis failed' },
      { status: 500 }
    );
  }
}
