import React, { useEffect, useRef } from "react";

// ScoreAxis v2 embed: a <script> that renders the widget into the div with id `widget-<widgetId>`.
export const LiveMatchWidget: React.FC<{ matchId: number | string }> =
  React.memo(({ matchId }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = ref.current;
      if (!el || !matchId) return;
      const widgetId = Math.random().toString(36).slice(2, 14);
      el.id = `widget-${widgetId}`;
      const params = new URLSearchParams({
        widgetId,
        lang: "en",
        lineupsBlock: "0",
        eventsBlock: "0",
        statsBlock: "0",
        links: "0",
        noFollowLinks: "0",
        font: "roboto",
        fontSize: "14",
        rowDensity: "100",
        widgetWidth: "auto",
        widgetHeight: "auto",
        bodyColor: "#ffffff",
        textColor: "#141416",
        linkColor: "#141416",
        borderColor: "#ecf1f7",
        tabColor: "#f3f8fd",
      });
      const script = document.createElement("script");
      script.src = `https://widgets.scoreaxis.com/api/football/live-match/${matchId}?${params}`;
      script.async = true;
      // the script requires itself and .widget-main-link to be direct children of #widget-<id>
      el.insertBefore(script, el.firstChild);
      return () => {
        el.querySelectorAll(":scope > script, :scope > .scoreaxis-inner-widget").forEach((n) => n.remove());
      };
    }, [matchId]);

    if (!matchId) return null;

    return (
      <div
        ref={ref}
        className="scoreaxis-widget"
        style={{
          fontSize: 14,
          backgroundColor: "#ffffff",
          color: "#141416",
          border: "1px solid #ecf1f7",
          overflow: "auto",
        }}
      >
        <div
          className="widget-main-link"
          style={{ padding: "6px 12px", fontWeight: 500 }}
        >
          Live data by{" "}
          <a href="https://www.scoreaxis.com/" style={{ color: "inherit" }}>
            Scoreaxis
          </a>
        </div>
      </div>
    );
  });
