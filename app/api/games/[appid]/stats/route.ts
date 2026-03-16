import { NextRequest, NextResponse } from "next/server";

type SteamCurrentPlayersResponse = {
  response: {
    player_count: number;
    result: number;
  };
};

type SteamChartPoint = [number, number] | { x: number; y: number };

const STEAM_CURRENT_PLAYERS_ENDPOINT =
  "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1";

const STEAM_CHART_DATA_ENDPOINT = (appid: number) =>
  `https://steamcharts.com/app/${appid}/chart-data.json`;

function parseChartPoint(point: SteamChartPoint): { timestampMs: number; players: number } | null {
  if (Array.isArray(point) && point.length >= 2) {
    return { timestampMs: Number(point[0]), players: Number(point[1]) };
  }

  if (typeof point === "object" && point !== null && "x" in point && "y" in point) {
    return { timestampMs: Number(point.x), players: Number(point.y) };
  }

  return null;
}

function getPeakInWindow(chart: SteamChartPoint[], windowMs: number): number | null {
  const now = Date.now();
  const from = now - windowMs;

  const values = chart
    .map(parseChartPoint)
    .filter((point): point is { timestampMs: number; players: number } => point !== null)
    .filter((point) => point.timestampMs >= from && point.timestampMs <= now)
    .map((point) => point.players)
    .filter((players) => Number.isFinite(players));

  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ appid: string }> },
) {
  const params = await context.params;
  const appid = Number(params.appid);

  if (!Number.isInteger(appid) || appid <= 0) {
    return NextResponse.json({ error: "Invalid appid" }, { status: 400 });
  }

  try {
    const [currentPlayersResponse, chartResponse] = await Promise.all([
      fetch(`${STEAM_CURRENT_PLAYERS_ENDPOINT}/?appid=${appid}`, {
        next: { revalidate: 60 },
      }),
      fetch(STEAM_CHART_DATA_ENDPOINT(appid), {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 300 },
      }),
    ]);

    let currentPlayers: number | null = null;
    if (currentPlayersResponse.ok) {
      const currentPlayersData =
        (await currentPlayersResponse.json()) as SteamCurrentPlayersResponse;
      currentPlayers =
        typeof currentPlayersData.response?.player_count === "number"
          ? currentPlayersData.response.player_count
          : null;
    }

    let peak24h: number | null = null;
    let peak7d: number | null = null;

    if (chartResponse.ok) {
      const chartData = (await chartResponse.json()) as SteamChartPoint[];

      peak24h = getPeakInWindow(chartData, 24 * 60 * 60 * 1000);
      peak7d = getPeakInWindow(chartData, 7 * 24 * 60 * 60 * 1000);
    }

    return NextResponse.json({
      appid,
      currentPlayers,
      peak24h,
      peak7d,
    });
  } catch {
    return NextResponse.json(
      {
        appid,
        currentPlayers: null,
        peak24h: null,
        peak7d: null,
      },
      { status: 500 },
    );
  }
}
