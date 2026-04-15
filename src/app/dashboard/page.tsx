import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard/Dashboard";
import { Game } from "@/lib/types";

export default async function DashboardPage() {
  let user = null;
  let favoriteAbbrs: string[] = [];
  let games: Game[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    // Use both today and yesterday to handle timezone edge cases
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

    if (user) {
      const { data: favorites } = await supabase
        .from("nba_favorites")
        .select("team_abbr")
        .eq("user_id", user.id);

      favoriteAbbrs = favorites?.map((f) => f.team_abbr) ?? [];
    }

    // Fetch games: try today first, fall back to most recent date with games
    const { data: todayGames } = await supabase
      .from("nba_games")
      .select("*")
      .in("date", [today, yesterday])
      .order("date", { ascending: false });

    let allGames = (todayGames as Game[]) ?? [];

    // If we have games from multiple dates, prefer the most recent date
    if (allGames.length > 0) {
      const latestDate = allGames[0].date;
      allGames = allGames.filter((g) => g.date === latestDate);
    }

    // Filter by favorites if logged in with favorites set
    if (favoriteAbbrs.length > 0) {
      games = allGames.filter(
        (g) => favoriteAbbrs.includes(g.home_team) || favoriteAbbrs.includes(g.away_team)
      );
    } else {
      games = allGames;
    }
  } catch {
    // Supabase client failed — render with empty state
  }

  return (
    <Dashboard
      initialGames={games}
      userFavoriteAbbrs={favoriteAbbrs}
      isLoggedIn={!!user}
      userEmail={user?.email ?? null}
    />
  );
}
