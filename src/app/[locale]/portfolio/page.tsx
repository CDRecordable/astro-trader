import { getTranslations } from "next-intl/server";
import PortfolioClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.portfolio" });
    return { title: t("title"), description: t("description") };
}

export default function PortfolioPage() {
    return <PortfolioClient />;
}
