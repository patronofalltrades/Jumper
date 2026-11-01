import { NextResponse, type NextRequest } from "next/server";
import { loadCatalog } from "@/lib/game/featured";
import { createClient } from "@/lib/supabase/server";

// The Build button of the dock: open the level map of the project that the lobby's Continue card opens.
export async function GET(request: NextRequest) {
  const { featured } = await loadCatalog(await createClient());
  return NextResponse.redirect(new URL(featured?.mapHref ?? "/lobby", request.url));
}
