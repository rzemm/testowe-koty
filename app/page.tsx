"use client";

import { FormEvent, useState } from "react";

type GameResult = {
  appid: number;
  name: string;
  icon?: string;
};

type GameStats = {
  currentPlayers: number | null;
  peak24h: number | null;
  peak7d: number | null;
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

function formatPlayersCount(value: number | null): string {
  if (value === null) {
    return "brak danych";
  }

  return numberFormatter.format(value);
}

export default function HomePage() {
  const [query, setQuery] = useState("mewgenics");
  const [results, setResults] = useState<GameResult[]>([]);
  const [statsByAppId, setStatsByAppId] = useState<Record<number, GameStats>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const payload = (await response.json()) as { items: GameResult[] };
      setResults(payload.items);

      const statsEntries = await Promise.all(
        payload.items.map(async (item) => {
          try {
            const statsResponse = await fetch(`/api/games/${item.appid}/stats`);

            if (!statsResponse.ok) {
              return [
                item.appid,
                { currentPlayers: null, peak24h: null, peak7d: null } as GameStats,
              ] as const;
            }

            const stats = (await statsResponse.json()) as {
              currentPlayers: number | null;
              peak24h: number | null;
              peak7d: number | null;
            };

            return [
              item.appid,
              {
                currentPlayers: stats.currentPlayers,
                peak24h: stats.peak24h,
                peak7d: stats.peak7d,
              } as GameStats,
            ] as const;
          } catch {
            return [
              item.appid,
              { currentPlayers: null, peak24h: null, peak7d: null } as GameStats,
            ] as const;
          }
        }),
      );

      setStatsByAppId(Object.fromEntries(statsEntries));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Wyszukiwarka gier (MVP)</h1>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wpisz nazwę gry, np. mewgenics"
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
        >
          Szukaj
        </button>
      </form>

      {status === "loading" ? <p>Szukam…</p> : null}
      {status === "error" ? (
        <p className="text-red-400">Nie udało się pobrać danych z API.</p>
      ) : null}

      <ul className="space-y-3">
        {results.map((game) => {
          const stats = statsByAppId[game.appid];

          return (
            <li key={game.appid} className="rounded border border-slate-800 p-3">
              <p className="font-semibold">{game.name}</p>
              <p className="text-sm text-slate-400">Steam AppID: {game.appid}</p>
              <p className="text-sm text-slate-300">
                Gra teraz: {formatPlayersCount(stats?.currentPlayers ?? null)}
              </p>
              <p className="text-sm text-slate-300">
                Max 24h: {formatPlayersCount(stats?.peak24h ?? null)}
              </p>
              <p className="text-sm text-slate-300">
                Max 7 dni: {formatPlayersCount(stats?.peak7d ?? null)}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
