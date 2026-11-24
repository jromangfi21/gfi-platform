import { NextRequest, NextResponse } from 'next/server';

const STAGE_FALLBACKS: Record<number, { branch: string; prompt: string; tip: string }> = {
  1: { branch: 'Opening Call', prompt: 'You recently requested info on retirement income strategies—do you have 10 minutes right now to see if we can help?', tip: 'Confirm & get 10m' },
  2: { branch: 'Personal Situation', prompt: 'Before we look at numbers, how old are you and when are you hoping to retire?', tip: 'Get ages & timeline' },
  3: { branch: 'Goals & Priorities', prompt: 'When you picture a successful retirement, what is the single biggest financial win you want to accomplish?', tip: 'Listen—do not pitch' },
  4: { branch: 'Current Assets', prompt: 'Roughly what do you have tucked away across your 401(k), IRA, Roth, or savings right now?', tip: 'Map asset buckets' },
  5: { branch: 'Debt & Obligations', prompt: 'Do you expect your mortgage and major debts to be paid off before you retire?', tip: 'Check fixed debt' },
  6: { branch: 'Market Risk', prompt: 'If the market dropped 25% right as you retired, how would that impact your retirement plans?', tip: 'Surface sequence risk' },
  7: { branch: 'Principal Safety', prompt: 'How important is it to have a portion of your nest egg 100% protected from market losses?', tip: 'Anchor safety need' },
  8: { branch: 'Liquidity Reserve', prompt: 'How much cash do you want kept completely liquid in the bank for emergencies or travel?', tip: 'Set cash buffer' },
  9: { branch: 'Income & Social Security', prompt: 'What monthly income do you need in retirement, and how much will Social Security or a pension cover?', tip: 'Quantify monthly gap' },
  10: { branch: 'Real Income Gap', prompt: 'So after Social Security, we need your savings to reliably generate that remaining monthly paycheck—does that sound right?', tip: 'Confirm exact gap' },
  11: { branch: 'Discovery Recap', prompt: 'Let me recap what you shared so far to make sure I did not miss anything important.', tip: 'Summarize & verify' },
  12: { branch: '4 Jobs of Money', prompt: 'In retirement, every dollar has one of four jobs: liquidity, guaranteed income, protected growth, or tax-free legacy.', tip: 'Frame 4-job model' },
  13: { branch: 'Book 45m Blueprint', prompt: 'Let’s put a 45-minute Blueprint session on the calendar so I can show you your exact numbers on screen—does Tuesday or Thursday work better?', tip: 'Close for 45m Zoom' },
};

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
    },
  };

  if (model.includes('3.8') || model.includes('2.5')) {
    body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(7500),
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
  const clonedReq = req.clone();
  try {
    const previewBody = await clonedReq.json();
    const rawTranscript = (previewBody?.transcript || '').trim();
    const advName = (previewBody?.advisorName || '').trim() || 'Advisor Name';
    if (!rawTranscript) {
      return Response.json({
        currentStage: 1,
        branchDetected: 'Stage 1: Open & Permission',
        suggestedNextPrompt: `Hey, there, this is ${advName}. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?`,
        coachingTip: 'Confirm request & secure 10-minute window',
        safetyMentioned: false,
        extractedData: {},
      });
    }
  } catch (_) {}
  try {
    const { transcript, advisorName, currentStage } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const recentTranscript = (transcript || '').slice(-1100);
    const advisorFirst = (advisorName || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
    const systemPrompt = buildSystemPrompt(advisorName || 'Advisor');
    const userPrompt = `Recent dialogue & notes:\n${recentTranscript}`;

    // Multi-model cascade so a 503 high-demand spike on one model fails over automatically in milliseconds
    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
    let res: Response | null = null;

    for (const model of models) {
      try {
        const attempt = await callGemini(model, apiKey, systemPrompt, userPrompt);
        if (attempt.ok) {
          res = attempt;
          break;
        }
      } catch {
        // try next model in cascade immediately
      }
    }

    // If all upstream Gemini endpoints experience a temporary spike, return seamless local stage guidance instead of an error banner
    if (!res) {
      const stageNum = Math.min(13, Math.max(1, Number(currentStage) || 2));
      const fb = STAGE_FALLBACKS[stageNum] || STAGE_FALLBACKS[2];
      return NextResponse.json({
        currentStage: stageNum,
        branchDetected: fb.branch,
        suggestedNextPrompt: fb.prompt,
        coachingTip: fb.tip,
      });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = safeParseJson(rawText);

    if (parsed?.extractedData) {
      let pName = parsed.extractedData.primaryName?.trim() || '';
      let sName = parsed.extractedData.spouseName?.trim() || '';

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
