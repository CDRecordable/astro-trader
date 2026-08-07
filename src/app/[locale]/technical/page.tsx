import { getTranslations } from "next-intl/server";
import TechnicalClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.technical" });
    return { title: t("title"), description: t("description") };
}

export default function TechnicalPage() {
    return <TechnicalClient />;
}
