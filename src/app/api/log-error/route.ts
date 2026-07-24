import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error, stack, context } = body;
    
    // Log the error in bold red to the Next.js dev server console/terminal
    console.error(
      `\x1b[1m\x1b[31m[CLIENT BRIDGE ERROR] [${context || "unknown"}]: ${error}\x1b[0m`
    );
    if (stack) {
      console.error(`\x1b[31m${stack}\x1b[0m`);
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 400 }
    );
  }
}
