import React from "react";

export const LiveMatchWidget: React.FC<{ matchId: number }> = React.memo(({ matchId }) => {
    if (!matchId) {
        return null;
    }

    const style = {
        width: '100%',
        height: 170,
        border: 'none',
        transition: 'all 300ms ease'
    }

    const iframeSrc = `https://www.scoreaxis.com/widget/live-match/${matchId}?autoHeight=1&amp;lineupsTab=0&amp;eventsTab=0&amp;statsTab=0&amp;font=0&amp;textColor=%23000000&amp;bodyBackground=%23ffffff&amp;inst=06be8`;
    return (
        <iframe id="Iframe" src={iframeSrc} style={style}></iframe >
    )
})