import { NextRequest, NextResponse } from 'next/server';


function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor Name';
  return `Real-time Retirement Discovery Call Co-Pilot for ${safeAdvisor}. Output compact JSON only.
Stages: 1:Open(10m) 2:Personal(age,spouse,work,retireAge) 3:Goals 4:Assets(401k/IRA/Roth/annuity) 5:Debt 6:Risk 7:Safe 8:Liquidity 9:Income(goal,SS,pension) 10:Gap 11:Recap 12:4Jobs 13:Book45m.
JSON schema:
{"currentStage":1,"branchDetected":"Stage","suggestedNextPrompt":"short exact line","coachingTip":"5-word cue","safetyMentioned":false,"extractedData":{"clientName":null,"currentAge":null,"spouseAge":null,"isMarried":null,"retirementAge":null,"currentEarnedIncome":null,"iraBalance":null,"rothBalance":null,"liquidReserveNeed":null,"desiredMonthlyIncome":null,"monthlySocialSecurity":null,"monthlyPensionFixed":null,"biggestConcern":null,"currentAnnuity":null}}`;
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, any> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 320,
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
    signal: AbortSignal.timeout(7000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, advisorName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const recentTranscript = (transcript || '').slice(-1200);
    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor Name');
    const userPrompt = `Transcript:\n${recentTranscript}`;

    // Race both models simultaneously and take the first valid 200 OK response
    const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    const response = await Promise.any(
      models.map(async (model) => {
        const res = await callGemini(model, apiKey, systemPrompt, userPrompt);
        if (!res.ok) throw new Error(`${model}:${res.status}`);
        return res;
      })
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.errors?.[0]?.message || err.message || 'Co-Pilot fast-extract failed' },
      { status: 502 }
    );
  }
}
