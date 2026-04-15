"use client";

import { useEffect, useState } from "react";
import { useRealtimeScores } from "@/hooks/useRealtimeScores";
import { classifyGames } from "@/lib/utils/game-status";
import { Game, Sport } from "@/lib/types";
import GameSection from "./GameSection";
import Link from "next/link";
import Navbar from "@/components/nav/Navbar";

const SPORTS: Sport[] = ["NBA", "NHL", "MLB"];

interface DashboardProps {
  initialGames: Game[];
  userFavoriteAbbrs: string[];
  isLoggedIn: boolean;
  userEmail: string | null;
}

export default function Dashboard({ initialGames, userFavoriteAbbrs, isLoggedIn, userEmail }: DashboardProps) {
  const games = useRealtimeScores(initialGames, userFavoriteAbbrs);
  const [activeSport, setActiveSport] = useState<Sport | "ALL">("ALL");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [games]);

  const filtered = activeSport === "ALL" ? games : games.filter((g) => g.sport === activeSport);
  const { live, final: finalGames, upcoming } = classifyGames(filtered);
  const noGames = live.length === 0 && finalGames.length === 0 && upcoming.length === 0;

  // Count games per sport for the tab badges
  const counts: Record<string, number> = { ALL: games.length };
  for (const s of SPORTS) counts[s] = games.filter((g) => g.sport === s).length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar isLoggedIn={isLoggedIn} userEmail={userEmail} />

      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Sport tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {(["ALL", ...SPORTS] as const).map((sport) => (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSport === sport
                  ? "bg-zinc-900 text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {sport === "ALL" ? "All Sports" : sport}
              {counts[sport] > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                  activeSport === sport ? "bg-zinc-700 text-zinc-200" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {counts[sport]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {noGames ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-500">
                No {activeSport === "ALL" ? "" : activeSport + " "}games today.
              </p>
              {!isLoggedIn && (
                <p className="mt-2 text-sm text-zinc-400">
                  <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-medium">
                    Sign up
                  </Link>
                  {" "}to pick favorite teams and get personalized scores.
                </p>
              )}
            </div>
          ) : (
            <>
              <GameSection title="Live" games={live} type="live" />
              <GameSection title="Final" games={finalGames} type="final" />
              <GameSection title="Upcoming" games={upcoming} type="upcoming" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
