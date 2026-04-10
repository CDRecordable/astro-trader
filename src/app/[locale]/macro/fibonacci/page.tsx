import { getTranslations } from "next-intl/server";
import FibonacciClient from "./client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.fibonacci" });
    return { title: t("title"), description: t("description") };
}

export default function FibonacciPage() {
    return <FibonacciClient />;
}
