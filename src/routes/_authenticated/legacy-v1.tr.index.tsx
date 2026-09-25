import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TravelExperience } from "@/components/travel/TravelExperience";
import { normalizeService } from "@/domain/experience/state";
import { useI18n } from "@/i18n";

const searchSchema = z.object({
  service: z.enum(["esim", "lounge"]).catch("esim").default("esim"),
});

export const Route = createFileRoute("/_authenticated/legacy-v1/tr/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Travely Türkiye | eSIM ve Havalimanı Lounge" },
      {
        name: "description",
        content: "Seyahatiniz için eSIM paketlerini ve havalimanı lounge seçeneklerini keşfedin.",
      },
      { property: "og:title", content: "Travely Türkiye | eSIM ve Havalimanı Lounge" },
      {
        property: "og:description",
        content: "Seyahatiniz için eSIM paketlerini ve havalimanı lounge seçeneklerini keşfedin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderpath-engine.lovable.app/tr" }],
  }),
  component: TurkishHomepage,
});

function TurkishHomepage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { locale, setLocale } = useI18n();
  const service = normalizeService(search.service);

  useEffect(() => {
    if (locale !== "tr") setLocale("tr");
  }, [locale, setLocale]);

  return (
    <TravelExperience
      service={service}
      onServiceChange={(next, options) => {
        if (options?.finderTarget) {
          void navigate({
            to: ".",
            search: { service: next },
            hash: "finder",
            resetScroll: false,
          });
          return;
        }
        void navigate({
          to: ".",
          search: { service: next },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}