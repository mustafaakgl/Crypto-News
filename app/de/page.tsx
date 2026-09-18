import type { Metadata } from "next";
import { HomePageContent } from "@/components/pages/HomePageContent";
import { getDictionary } from "@/lib/i18n/getDictionary";

export const revalidate = 300;

export const metadata: Metadata = { description: getDictionary("de").meta.homeDescription };

export default function DashboardPage() {
  return <HomePageContent locale="de" />;
}
