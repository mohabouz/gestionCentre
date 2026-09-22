import { NextResponse } from "next/server";
import { getCurrentUser, hasUsers } from "@/lib/auth";

export async function GET() {
  try { return NextResponse.json({ needsSetup: !(await hasUsers()), user: await getCurrentUser() }); }
  catch (error) { console.error(error); return NextResponse.json({ error: "Unable to check authentication" }, { status: 500 }); }
}
