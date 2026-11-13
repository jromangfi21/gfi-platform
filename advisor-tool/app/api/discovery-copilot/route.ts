import { NextRequest, NextResponse } from 'next/server';

function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor Name';
  return `Retirement Discovery Co-Pilot for ${safeAdvisor}. Analyze the call transcript & notes, extract ALL mentioned client numbers/details into extractedData (convert "500k"->500000, "1.2 million"->1200000), and return ONLY compact single-line JSON:
{"currentStage":1,"branchDetected":"Stage","suggestedNextPrompt":"short exact next question (max 20 words)","coachingTip":"3-word cue","safetyMentioned":false,"extractedData":{"clientName":null,"currentAge":null,"spouseAge":null,"isMarried":null,"retirementAge":null,"currentEarnedIncome":null,"iraBalance":null,"rothBalance":null,"liquidReserveNeed":null,"desiredMonthlyIncome":null,"monthlySocialSecurity":null,"monthlyPensionFixed":null,"biggestConcern":null,"currentAnnuity":null}}
13 Stages: 1:Open(10m) 2:Personal(age,spouse,kids,work,retireAge) 3:Goals(vision,priority,1 win) 4:Assets(401k/IRA/Roth/annuity,advisor) 5:Debt 6:Risk(crash,down-market) 7:Safe 8:Liquidity 9:Income(goal,SS,pension,gap) 10:RealGap 11:Recap 12:4Jobs 13:Book45m.`;
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, any> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
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
    signal: AbortSignal.timeout(12000),
  });
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const stageMatch = raw.match(/"currentStage"\s*:\s*(\d+)/);
    const branchMatch = raw.match(/"branchDetected"\s*:\s*"([^"]*)"/);
    const promptMatch = raw.match(/"suggestedNextPrompt"\s*:\s*"([^"]*)"/);
    const tipMatch = raw.match(/"coachingTip"\s*:\s*"([^"]*)"/);
    return {
      currentStage: stageMatch ? Number(stageMatch[1]) : undefined,
      branchDetected: branchMatch ? branchMatch[1] : 'Active Call',
      suggestedNextPrompt: promptMatch ? promptMatch[1] : undefined,
      coachingTip: tipMatch ? tipMatch[1] : 'Continue discovery script',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, advisorName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const recentTranscript = (transcript || '').slice(-2500);
    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor Name');
    const userPrompt = `Call transcript and advisor notes:\n${recentTranscript}`;

    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let res: Response | null = null;
    let lastError = 'Co-Pilot request timed out';

    for (const model of models) {
      try {
        const attempt = await callGemini(model, apiKey, systemPrompt, userPrompt);
        if (attempt.ok) {
          res = attempt;
          break;
        }
        const errData = await attempt.json().catch(() => ({}));
        lastError = errData?.error?.message || `Gemini API error (${attempt.status})`;
      } catch (e: any) {
        lastError = e.message || `${model} timed out`;
      }
    }

    if (!res) {
      return NextResponse.json({ error: lastError }, { status: 504 });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return NextResponse.json(safeParseJson(rawText));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Co-Pilot analysis failed' },
      { status: 500 }
    );
  }
}
