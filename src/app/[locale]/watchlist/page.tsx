import { getTranslations } from "next-intl/server";
import WatchlistClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.watchlist" });
    return { title: t("title"), description: t("description") };
}

export default function WatchlistPage() {
    return <WatchlistClient />;
}
