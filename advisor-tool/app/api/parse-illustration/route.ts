import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { pagesBase64, fileBase64, mimeType, fileName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const prompt = `Extract the key retirement annuity or financial product illustration figures from this document (${fileName || 'illustration'}). Return ONLY valid compact JSON with these exact keys (numbers only without $ or commas, or null if not found):
{"carrierName":null,"productName":null,"initialPremium":null,"bonusPercent":null,"surrenderYears":null,"guaranteedMonthlyIncome":null,"illustratedMonthlyIncome":null,"guaranteedRatePercent":null,"illustratedRatePercent":null,"principalProtected":true,"keyHighlights":"1-sentence summary of core benefit"}`;

    const parts: any[] = [{ text: prompt }];

    if (Array.isArray(pagesBase64) && pagesBase64.length > 0) {
      for (const page of pagesBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: page,
          },
        });
      }
    } else if (fileBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBase64,
        },
      });
    } else {
      return NextResponse.json({ error: 'No file data received' }, { status: 400 });
    }

    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let lastError = 'Illustration parsing failed';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const body: Record<string, any> = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        };

        if (model.includes('3.8')) {
          body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData?.error?.message || `Gemini API error (${res.status})`;
          continue;
        }

        const data = await res.json();
        const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        return NextResponse.json(JSON.parse(rawText));
      } catch (e: any) {
        lastError = e.message || `${model} timed out`;
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to parse illustration' },
      { status: 500 }
    );
  }
}
