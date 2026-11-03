import type { Game } from "@/types/database.types";

/** "home – away"; once a result exists the winner is bold and the loser regular, a draw keeps both equal */
export const Teams = ({ game }: { game: Pick<Game, "home_team" | "away_team" | "result"> }) => {
  const weight = (side: "1" | "2") =>
    !game.result || game.result === "X" ? "font-semibold" : game.result === side ? "font-bold" : "font-normal";

  return (
    <>
      <span className={weight("1")}>{game.home_team}</span>
      <span className="font-normal"> – </span>
      <span className={weight("2")}>{game.away_team}</span>
    </>
  );
};
