import { NextResponse, type NextRequest } from "next/server";
import { loadCatalog } from "@/lib/game/featured";
import { createClient } from "@/lib/supabase/server";

// The Build button of the dock: open the level that the lobby's Continue button opens.
export async function GET(request: NextRequest) {
  const { featured } = await loadCatalog(await createClient());
  return NextResponse.redirect(new URL(featured?.href ?? "/lobby", request.url));
}
