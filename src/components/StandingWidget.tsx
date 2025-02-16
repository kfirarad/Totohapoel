import * as React from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerContent,
} from "@/components/ui/drawer"

interface StandingWidgetProps {
    leagueId: number | null;
    isOpened: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const StandingWidget: React.FC<StandingWidgetProps> = ({
    leagueId,
    isOpened,
    onOpenChange
}) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    if (!leagueId) {
        return null;
    }


    if (isDesktop) {
        return (
            <Dialog open={isOpened} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <ScoreAxisWidget leagueId={leagueId} />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={isOpened} onOpenChange={onOpenChange}>
            <DrawerContent>
                <ScoreAxisWidget leagueId={leagueId} />
            </DrawerContent>
        </Drawer>
    )
}


const ScoreAxisWidget: React.FC<{ leagueId: number }> = React.memo(({ leagueId }) => {
    const widgetStyles = {
        borderWidth: '1px',
        borderColor: 'rgba(0, 0, 0, 0.15)',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '10px',
        background: 'rgb(255, 255, 255)',
        width: '100%'
    };

    const iframeStyles = {
        height: '80vh',
        width: '100%',
        border: 'none',
        transition: 'all 300ms ease'
    };

    const dataProvidedStyles = {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'left'
    };



    const iframeUrl = `https://www.scoreaxis.com/widget/standings-widget/${leagueId}?autoHeight=1&amp;groupNum=undefined&amp;inst=12637`;
    return (
        <div>
            <div id="scoreaxis-widget-12637" style={widgetStyles}>
                <iframe id="Iframe" src={iframeUrl} style={iframeStyles}></iframe>
                <script>
                    {/* window.addEventListener("DOMContentLoaded",event=>{window.addEventListener("message", event => { if (event.data.appHeight && "12637" == event.data.inst) { let container = document.querySelector("#scoreaxis-widget-12637 iframe"); container && (container.style.height = parseInt(event.data.appHeight) + "px") } }, !1)}); */}
                </script>
            </div>
            <div style={dataProvidedStyles}>Data provided by <a target="_blank" href="https://www.scoreaxis.com/">Scoreaxis</a></div>
        </div>
    )
})


/**
 * 
 * 
 * <div id="scoreaxis-widget-c8b99"><iframe id="Iframe" src="https://www.scoreaxis.com/widget/standings-widget/564?autoHeight=1&amp;groupNum=undefined&amp;lang=he&amp;font=0&amp;fontSize=14&amp;links=0&amp;widgetRows=1%2C1%2C1%2C1%2C1%2C1%2C1%2C0%2C1%2C1&amp;header=1&amp;teamsLogo=1&amp;widgetHomeAwayTabs=1&amp;removeBorders=1&amp;inst=c8b99" style="width:100%;border:none;transition:all 300ms ease"></iframe><script>window.addEventListener("DOMContentLoaded",event=>{window.addEventListener("message",event=>{if(event.data.appHeight&&"c8b99"==event.data.inst){let container=document.querySelector("#scoreaxis-widget-c8b99 iframe");container&&(container.style.height=parseInt(event.data.appHeight)+"px")}},!1)});</script></div><div style="font-size: 12px; font-family: Arial, sans-serif; text-align: left;">Data provided by <a target="_blank" href="https://www.scoreaxis.com/">Scoreaxis</a></div>
 */