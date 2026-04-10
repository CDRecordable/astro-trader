import { getTranslations } from "next-intl/server";
import ScreenerClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.screener" });
    return { title: t("title"), description: t("description") };
}

export default function ScreenerPage() {
    return <ScreenerClient />;
}
