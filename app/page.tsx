"use client";

import { FormEvent, useState } from "react";

type GameResult = {
  appid: number;
  name: string;
  icon?: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("mewgenics");
  const [results, setResults] = useState<GameResult[]>([]);
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
        {results.map((game) => (
          <li key={game.appid} className="rounded border border-slate-800 p-3">
            <p className="font-semibold">{game.name}</p>
            <p className="text-sm text-slate-400">Steam AppID: {game.appid}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
