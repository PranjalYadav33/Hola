import { NextRequest, NextResponse } from "next/server";
import { generateToken04 } from "./zegoServerAssistant";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userID = url.searchParams.get("userID");

  if (!userID) {
    return NextResponse.json({ error: "userID is required" }, { status: 400 });
  }

  const appID = process.env.ZEGO_APP_ID;
  const serverSecret = process.env.ZEGO_SERVER_SECRET;

  if (!appID || !serverSecret) {
    console.error("Missing ZEGO environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const effectiveTimeInSeconds = 3600;
    const payload = "";

    const token = generateToken04(
      +appID,
      userID,
      serverSecret,
      effectiveTimeInSeconds,
      payload
    );

    return NextResponse.json({ token, appID: +appID });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
