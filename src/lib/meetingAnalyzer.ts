import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MeetingIntelligenceResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  dealRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  riskReasons: string[];
  competitors: string[];
  objections: string[];
  keyTopics: string[];
  nextStepConfirmed: boolean;
  talkRatio: number | null;
  excitement: number | null;
  aiSummary: string;
}

const ANALYSIS_PROMPT = `You are a revenue intelligence analyst. Analyze the meeting transcript below and return a JSON object with exactly these fields:

{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "dealRisk": "none" | "low" | "medium" | "high" | "critical",
  "riskReasons": string[],        // reasons why this deal is at risk (empty array if none)
  "competitors": string[],         // competitor names mentioned (empty array if none)
  "objections": string[],          // objections raised by the prospect (empty array if none)
  "keyTopics": string[],           // top 5 topics discussed (empty array if none)
  "nextStepConfirmed": boolean,    // did they agree to a specific next step/meeting?
  "talkRatio": number | null,      // estimated fraction 0-1 that the rep was talking (null if unclear)
  "excitement": number | null,     // buyer enthusiasm score 1-10 (null if unclear)
  "aiSummary": string              // 3-sentence plain-English summary of the meeting
}

Guidelines:
- dealRisk "critical": deal is likely lost or at severe risk of falling through
- dealRisk "high": multiple red flags — budget unclear, competitor favored, champion disengaged
- dealRisk "medium": 1-2 moderate concerns (no next step, some objections, long silence)
- dealRisk "low": minor concerns but deal is progressing
- dealRisk "none": deal is healthy, good engagement, clear next steps
- riskReasons: concrete reasons like "no budget confirmed", "competitor Salesforce mentioned 3 times", "no next meeting set"
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function analyzeMeeting(
  title: string,
  summary: string | null,
  transcript: string | null,
): Promise<MeetingIntelligenceResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const content = [
    `Meeting: ${title}`,
    summary ? `Summary:\n${summary}` : '',
    transcript ? `Transcript:\n${transcript.slice(0, 12000)}` : '',
  ].filter(Boolean).join('\n\n');

  if (content.length < 50) return null;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content },
      ],
      max_tokens: 1024,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MeetingIntelligenceResult;

    // Sanitise
    return {
      sentiment: ['positive', 'neutral', 'negative', 'mixed'].includes(parsed.sentiment)
        ? parsed.sentiment
        : 'neutral',
      dealRisk: ['none', 'low', 'medium', 'high', 'critical'].includes(parsed.dealRisk)
        ? parsed.dealRisk
        : 'none',
      riskReasons: Array.isArray(parsed.riskReasons) ? parsed.riskReasons.slice(0, 6) : [],
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors.slice(0, 8) : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections.slice(0, 8) : [],
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.slice(0, 6) : [],
      nextStepConfirmed: Boolean(parsed.nextStepConfirmed),
      talkRatio: typeof parsed.talkRatio === 'number' ? Math.min(1, Math.max(0, parsed.talkRatio)) : null,
      excitement: typeof parsed.excitement === 'number' ? Math.min(10, Math.max(1, Math.round(parsed.excitement))) : null,
      aiSummary: typeof parsed.aiSummary === 'string' ? parsed.aiSummary : '',
    };
  } catch {
    return null;
  }
}
