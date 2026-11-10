import { useTranslation } from "react-i18next";

const Footer = () => {
    const { t } = useTranslation();
    return <footer className="py-6 text-center text-xs text-muted-foreground">
        {t("app.name")} · {new Date().getFullYear()}
    </footer>
}

export { Footer }
