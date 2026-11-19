import { NextRequest, NextResponse } from 'next/server';

function buildSystemPrompt(advisorName: string) {
  const safeAdvisor = advisorName?.trim() || 'Advisor';
  return `Fast Retirement Discovery Co-Pilot for advisor "${safeAdvisor}". NEVER extract "${safeAdvisor}" or [Advisor] lines as primaryName or spouseName—only extract the prospect/client names. Convert "500k"->500000. Return ONLY compact JSON:
{"currentStage":1,"branchDetected":"Stage","suggestedNextPrompt":"short exact next question using client first name(s) (max 20 words)","coachingTip":"3-word cue","safetyMentioned":false,"extractedData":{"primaryName":null,"spouseName":null,"clientName":null,"currentAge":null,"spouseAge":null,"isMarried":null,"retirementAge":null,"currentEarnedIncome":null,"iraBalance":null,"rothBalance":null,"liquidReserveNeed":null,"desiredMonthlyIncome":null,"monthlySocialSecurity":null,"monthlyPensionFixed":null,"biggestConcern":null,"hasExistingAnnuity":null}}
Stages: 1:Open 2:Personal 3:Goals 4:Assets 5:Debt 6:Risk 7:Safe 8:Liquidity 9:Income 10:RealGap 11:Recap 12:4Jobs 13:Book45m.`;
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: Record<string, any> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 260,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
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
      coachingTip: tipMatch ? tipMatch[1] : 'Continue discovery',
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

    const recentTranscript = (transcript || '').slice(-1100);
    const advisorFirst = (advisorName || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor');
    const userPrompt = `Recent dialogue & notes:\n${recentTranscript}`;

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
    const parsed = safeParseJson(rawText);

    if (parsed?.extractedData) {
      let pName = parsed.extractedData.primaryName?.trim() || '';
      let sName = parsed.extractedData.spouseName?.trim() || '';

      // Strip out advisor's own first name if accidentally extracted
      if (advisorFirst && pName.toLowerCase() === advisorFirst) {
        pName = '';
        parsed.extractedData.primaryName = null;
      }
      if (advisorFirst && sName.toLowerCase() === advisorFirst) {
        sName = '';
        parsed.extractedData.spouseName = null;
      }

      if (pName && sName) {
        parsed.extractedData.clientName = `${pName} & ${sName}`;
      } else if (pName) {
        parsed.extractedData.clientName = pName;
      } else {
        parsed.extractedData.clientName = null;
      }
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Co-Pilot analysis failed' },
      { status: 500 }
    );
  }
}
