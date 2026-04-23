import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(req: NextRequest) {
  try {
    // Check if API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY not found in environment variables",
          env: Object.keys(process.env).filter(k => k.includes('OPENAI'))
        },
        { status: 500 }
      );
    }

    // Log API key format (first/last 4 chars only for security)
    const keyPreview = `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log("API Key found:", keyPreview);

    // Test OpenAI connection
    const openai = new OpenAI({ apiKey });

    console.log("Testing OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'test successful' if you can read this." },
      ],
      max_tokens: 50,
    });

    const result = response.choices[0]?.message?.content || "No response";

    return NextResponse.json({
      success: true,
      apiKeyPreview: keyPreview,
      response: result,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    console.error("OpenAI test failed:", error);

    let errorDetails: any = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.constructor.name : typeof error,
    };

    // If it's an OpenAI API error, extract more details
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as any;
      errorDetails.status = apiError.response?.status;
      errorDetails.statusText = apiError.response?.statusText;
      errorDetails.data = apiError.response?.data;
    }

    return NextResponse.json(
      {
        error: "OpenAI API test failed",
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
