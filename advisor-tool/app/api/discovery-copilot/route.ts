import { NextRequest, NextResponse } from 'next/server';

const DISCOVERY_SCRIPT_SYSTEM_PROMPT = `
You are an elite real-time Retirement Discovery Call Co-Pilot assisting advisor RJ Pimentel.
Your job is to listen to the live call transcript, track progress through the 13-stage "RETIREMENT DISCOVERY CALL" script, recommend the EXACT next question or response (including conditional branches), and extract every financial figure mentioned into structured JSON.

THE 13-STAGE SCRIPT:
1. OPEN: "Hey, [Name], this is RJ Pimentel. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?"
   - IF YES: "Perfect. What was it that caught your attention?" -> Let them talk -> "Gotcha. What I'd like to do is ask you a few questions so I can understand what you're trying to accomplish and see if there's anything I can actually help with. Do you have about 10 minutes right now, or would it be better to set up a time?"
   - IF THEY DON'T REMEMBER: "No problem. Sometimes people don't remember the specific request. Before I let you go, are retirement income or protecting your retirement savings things you're currently thinking about?" (IF NO: Close politely. IF YES: Ask for 10 minutes now or later).
2. PERSONAL SITUATION AND TIMING: Age -> Married? (IF MARRIED: Spouse's age) -> Kids? Grown/helping financially? Leaving money behind important? -> Working or retired? (IF WORKING: Occupation, spouse occupation, total household income) -> Ideal retirement age & flexibility.
3. WHAT DO THEY WANT?: Picture a successful retirement financially -> Most important thing about money in retirement -> (IF NEEDED: Growth, protection, income, liquidity, or combination) -> "If we could accomplish one thing for you financially that would make you feel better about retirement, what would that be?" (Don't pitch).
4. ASSETS AND CURRENT STRATEGY: Account types (401k, IRA, brokerage accounts, savings, annuities) -> Total accumulated -> Any currently in an annuity? -> Self-managed or advisor? (IF ADVISOR: What do you like / wish was different?) -> Current strategy.
5. DEBT AND OBLIGATIONS: Significant debt or ongoing obligations going into retirement (mortgage, loans, family).
6. MARKET RISK: Impact of substantial drop right after retirement -> Pulling income when market is down -> More concerned with missing upside or experiencing major loss?
7. DEFINE SAFE (ONLY IF THEY BRING UP SAFETY): "You've mentioned wanting some of your money safe. When you say 'safe,' what does safe mean to you?" -> "Is protecting that portion of your retirement more important to you than maximizing every bit of potential upside?"
8. LIQUIDITY: How much kept completely liquid/accessible -> Major purchases/expenses next few years -> How much can be positioned for longer-term needs?
9. RETIREMENT INCOME AND PREDICTABILITY: Desired monthly income in retirement -> Expected Social Security, pensions, guaranteed sources -> IDENTIFY THE GAP (Desired monthly minus guaranteed monthly) -> How do they plan to fill it -> Importance of predictable monthly income & income that can't be outlived -> Tradeoff between predictability vs. maximum growth.
10. FIND THE REAL GAP: "So after talking through all of this, what concerns you most about your current retirement strategy?" -> "If nothing changed between now and retirement, how comfortable would you be with the plan you have today?"
11. SUMMARIZE THEIR OWN WORDS: Recap target retirement age, desired monthly income, guaranteed income covered, total accumulated, liquid reserve amount, biggest concern, and desire for predictability. Wait for YES.
12. GIVE THEIR MONEY DIFFERENT JOBS: Agree that not all money needs to do the same job -> 4 jobs: Liquid, Growth, Protection, Income.
13. BOOK THE STRATEGY APPOINTMENT: Offer to do research and walk through options -> Set day/time -> IF MARRIED: Invite spouse -> Set 45-60 minute expectation.

Return ONLY valid JSON matching this exact structure:
{
  "currentStage": 1,
  "stageName": "1. Open & Permission",
  "branchDetected": "Opening Call",
  "suggestedNextPrompt": "exact verbatim or tailored script line to say next",
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

async function callGemini(model: string, apiKey: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: DISCOVERY_SCRIPT_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, currentData } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const userPrompt = `Previously extracted client data: ${JSON.stringify(
      currentData
    )}\n\nLive Call Transcript:\n${transcript}`;

    let response = await callGemini('gemini-3.8-flash', apiKey, userPrompt);

    if (!response.ok) {
      response = await callGemini('gemini-3.5-flash-lite', apiKey, userPrompt);
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Gemini API request failed' },
        { status: response.status }
      );
    }

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