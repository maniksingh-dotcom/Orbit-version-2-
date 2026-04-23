import { NextRequest, NextResponse } from "next/server";
import { processAiRequest, type AiAction } from "@/lib/openai";

const VALID_ACTIONS: AiAction[] = [
  "rephrase",
  "summarize",
  "draft_reply",
  "expand",
  "insights",
  "suggest_actions",
];

export async function POST(req: NextRequest) {
  try {
    const { action, text, context } = await req.json();

    if (!action || !text) {
      return NextResponse.json(
        { error: "Missing required fields: action, text" },
        { status: 400 }
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await processAiRequest(action, text, context);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: `AI request failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
