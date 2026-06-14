import { getTranslations } from "next-intl/server";
import SettingsClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.settings" });
    return { title: t("title"), description: t("description") };
}

export default function SettingsPage() {
    return <SettingsClient />;
}
