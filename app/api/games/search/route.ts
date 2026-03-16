import { NextRequest, NextResponse } from "next/server";

type SteamSearchItem = {
  appid: number;
  name: string;
  icon: string;
};

const STEAM_SEARCH_ENDPOINT = "https://steamcommunity.com/actions/SearchApps";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  try {
    const response = await fetch(`${STEAM_SEARCH_ENDPOINT}/${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] }, { status: 502 });
    }

    const data = (await response.json()) as SteamSearchItem[];

    return NextResponse.json({
      items: data.map((item) => ({
        appid: item.appid,
        name: item.name,
        icon: item.icon,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
