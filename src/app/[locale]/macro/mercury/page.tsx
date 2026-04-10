import { getTranslations } from "next-intl/server";
import MercuryClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.mercury" });
    return { title: t("title"), description: t("description") };
}

export default function MercuryPage() {
    return <MercuryClient />;
}
