import { Sport } from "@/lib/types";

const COLORS: Record<Sport, string> = {
  NBA: "bg-orange-100 text-orange-700",
  NHL: "bg-blue-100 text-blue-700",
  MLB: "bg-red-100 text-red-700",
};

export default function SportBadge({ sport }: { sport: Sport }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${COLORS[sport]}`}>
      {sport}
    </span>
  );
}
