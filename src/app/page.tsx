// This file is replaced by [locale]/page.tsx route structure
// Keeping as a redirect to ensure the root / works
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/en/macro");
}
