import * as React from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

interface StandingWidgetProps {
  leagueId: string | null;
  isOpened: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const StandingWidget: React.FC<StandingWidgetProps> = ({
  leagueId,
  isOpened,
  onOpenChange,
}) => {
  if (!leagueId) {
    return null;
  }

  return (
    <Dialog open={isOpened} onOpenChange={onOpenChange}>
      <DialogContent className="sm:min-w-[50vw] max-h-[80vh] overflow-auto">
        <ScoreAxisWidget leagueId={leagueId} />
      </DialogContent>
    </Dialog>
  );
};

const ScoreAxisWidget: React.FC<{ leagueId: string }> = React.memo(
  ({ leagueId }) => {
    const widgetId = "widget-1dpmmjcitn6h";
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!containerRef.current) return;

      // Clear any existing content
      containerRef.current.innerHTML = "";

      // Create the script element
      const script = document.createElement("script");
      script.src = `https://widgets.scoreaxis.com/api/football/league-table/${leagueId}?widgetId=1dpmmjcitn6h&lang=en&teamLogo=1&tableLines=0&homeAway=1&header=1&position=1&goals=1&gamesCount=1&diff=1&winCount=1&drawCount=1&loseCount=1&lastGames=1&points=1&teamsLimit=all&links=1&font=heebo&fontSize=14&widgetWidth=auto&widgetHeight=auto&bodyColor=%23ffffff&textColor=%23141416&linkColor=%23141416&borderColor=%23ecf1f7&tabColor=%23f3f8fd`;
      script.async = true;

      // Create the footer link
      const footerDiv = document.createElement("div");
      footerDiv.className = "widget-main-link";
      footerDiv.style.cssText = "padding: 6px 12px;font-weight: 500;";
      footerDiv.innerHTML =
        'Live data by <a href="https://www.scoreaxis.com/" style="color: inherit;">Scoreaxis</a>';

      // Append script and footer to container
      containerRef.current.appendChild(script);
      containerRef.current.appendChild(footerDiv);

      // Cleanup function
      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      };
    }, [leagueId]);

    return (
      <div
        id={widgetId}
        ref={containerRef}
        className="scoreaxis-widget"
        style={{
          width: "auto",
          height: "auto",
          fontSize: "14px",
          backgroundColor: "#ffffff",
          color: "#141416",
          border: "1px solid",
          borderColor: "#ecf1f7",
          overflow: "auto",
        }}
      />
    );
  }
);
