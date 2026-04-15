const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL = 30_000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ===================== NBA =====================

async function fetchNba(today) {
  const res = await fetch("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.scoreboard?.games || []).map((g) => {
    let clock = null;
    if (g.gameStatus === 3) {
      clock = g.gameStatusText || "Final";
    } else if (g.gameStatus === 2) {
      const st = (g.gameStatusText || "").toLowerCase();
      if (st.includes("half")) { clock = "Halftime"; }
      else {
        let t = "";
        const m = (g.gameClock || "").match(/PT(\d+)M([\d.]+)S/);
        if (m) t = `${parseInt(m[1])}:${Math.floor(parseFloat(m[2])).toString().padStart(2, "0")}`;
        const p = g.period || 0;
        clock = p <= 4 ? `Q${p} ${t}`.trim() : `OT${p - 4 > 1 ? p - 4 : ""} ${t}`.trim();
      }
    }
    return {
      id: parseInt(g.gameId),
      sport: "NBA",
      home_team: g.homeTeam.teamTricode,
      away_team: g.awayTeam.teamTricode,
      home_score: g.homeTeam.score,
      away_score: g.awayTeam.score,
      status: g.gameStatus === 2 ? "live" : g.gameStatus === 3 ? "final" : "scheduled",
      game_clock: clock,
      home_logo: `https://cdn.nba.com/logos/nba/${g.homeTeam.teamId}/global/L/logo.svg`,
      away_logo: `https://cdn.nba.com/logos/nba/${g.awayTeam.teamId}/global/L/logo.svg`,
      date: today,
      scheduled_at: g.gameTimeUTC,
      updated_at: new Date().toISOString(),
    };
  });
}

// ===================== NHL =====================

async function fetchNhl(today) {
  const res = await fetch(`https://api-web.nhle.com/v1/score/${today}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.games || []).map((g) => {
    const st = g.gameState;
    let status = "scheduled";
    if (st === "FINAL" || st === "OFF") status = "final";
    else if (st === "LIVE" || st === "CRIT") status = "live";

    let clock = null;
    if (status === "final") clock = "Final";
    else if (status === "live") {
      const c = g.clock;
      const p = g.period || 0;
      if (c?.inIntermission) clock = p <= 3 ? `P${p} INT` : "OT INT";
      else {
        const t = c?.timeRemaining || "";
        clock = p <= 3 ? `P${p} ${t}`.trim() : `OT ${t}`.trim();
      }
    }

    return {
      id: g.id,
      sport: "NHL",
      home_team: g.homeTeam.abbrev,
      away_team: g.awayTeam.abbrev,
      home_score: g.homeTeam.score ?? 0,
      away_score: g.awayTeam.score ?? 0,
      status,
      game_clock: clock,
      home_logo: g.homeTeam.logo || `https://assets.nhle.com/logos/nhl/svg/${g.homeTeam.abbrev}_light.svg`,
      away_logo: g.awayTeam.logo || `https://assets.nhle.com/logos/nhl/svg/${g.awayTeam.abbrev}_light.svg`,
      date: today,
      scheduled_at: g.startTimeUTC,
      updated_at: new Date().toISOString(),
    };
  });
}

// ===================== MLB =====================

async function fetchMlb(today) {
  const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=linescore,team`);
  if (!res.ok) return [];
  const data = await res.json();
  const rows = [];
  for (const date of data.dates || []) {
    for (const g of date.games || []) {
      const ds = g.status.detailedState;
      let status = "scheduled";
      if (ds === "Final" || ds === "Game Over" || ds.startsWith("Final") || ds === "Completed Early") status = "final";
      else if (ds === "In Progress" || ds === "Manager Challenge" || ds === "Delayed" || ds === "Warmup") status = "live";

      let clock = null;
      if (status === "final") clock = ds;
      else if (status === "live") {
        const ls = g.linescore;
        if (ls) {
          const half = ls.isTopInning ? "Top" : "Bot";
          clock = `${half} ${ls.currentInning || ""}`.trim();
        } else clock = "Live";
      }

      rows.push({
        id: g.gamePk,
        sport: "MLB",
        home_team: g.teams.home.team.abbreviation || g.teams.home.team.name.slice(0, 3).toUpperCase(),
        away_team: g.teams.away.team.abbreviation || g.teams.away.team.name.slice(0, 3).toUpperCase(),
        home_score: g.teams.home.score ?? 0,
        away_score: g.teams.away.score ?? 0,
        status,
        game_clock: clock,
        home_logo: `https://www.mlbstatic.com/team-logos/${g.teams.home.team.id}.svg`,
        away_logo: `https://www.mlbstatic.com/team-logos/${g.teams.away.team.id}.svg`,
        date: today,
        scheduled_at: g.gameDate,
        updated_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

// ===================== Poll =====================

async function poll() {
  const start = Date.now();
  const today = new Date().toISOString().split("T")[0];

  try {
    const [nba, nhl, mlb] = await Promise.all([
      fetchNba(today).catch((e) => { console.error("NBA:", e.message); return []; }),
      fetchNhl(today).catch((e) => { console.error("NHL:", e.message); return []; }),
      fetchMlb(today).catch((e) => { console.error("MLB:", e.message); return []; }),
    ]);

    const all = [...nba, ...nhl, ...mlb];
    if (all.length === 0) {
      console.log(`[${new Date().toISOString()}] No games today`);
      return;
    }

    const { error } = await supabase.from("nba_games").upsert(all, { onConflict: "id" });
    if (error) { console.error("Upsert:", error.message); return; }

    console.log(`[${new Date().toISOString()}] ${all.length} games (NBA:${nba.length} NHL:${nhl.length} MLB:${mlb.length}) in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("Poll failed:", err.message);
  }
}

async function main() {
  console.log("Sports Score Worker — NBA + NHL + MLB");
  console.log(`Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log("---");
  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main();
