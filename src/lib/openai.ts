import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AiAction =
  | "rephrase"
  | "summarize"
  | "draft_reply"
  | "expand"
  | "insights"
  | "suggest_actions";

const SYSTEM_PROMPTS: Record<AiAction, string> = {
  rephrase:
    "You are a professional writing assistant. Rephrase the given text to be clearer, more professional, and well-structured. Keep the same meaning and tone. Return only the rephrased text, no explanations.",

  summarize:
    "You are a concise summarizer. Summarize the given text into key bullet points. Focus on decisions, action items, and important details. Use bullet points (•). Keep it brief.",

  draft_reply:
    "You are a professional email assistant. Draft a polite, professional reply to the email below. Keep it concise and friendly. Return only the reply body text, no subject line or greetings format — just the message content.",

  expand:
    "You are a business writing expert. Take the brief notes below and expand them into a comprehensive, well-structured paragraph. Add professional language while preserving all original points. Return only the expanded text.",

  insights:
    "You are a business analyst. Analyze the information below and provide 3-5 key insights or observations. Focus on actionable takeaways, risks, and opportunities. Use bullet points (•).",

  suggest_actions:
    "You are a project manager. Based on the text below, suggest 3-5 specific action items that should be followed up on. Each should be a clear, actionable task. Use bullet points (•).",
};

export async function processAiRequest(
  action: AiAction,
  text: string,
  context?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const systemPrompt = SYSTEM_PROMPTS[action];
  if (!systemPrompt) {
    throw new Error(`Unknown AI action: ${action}`);
  }

  const userMessage = context
    ? `Context: ${context}\n\n---\n\n${text}`
    : text;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}
