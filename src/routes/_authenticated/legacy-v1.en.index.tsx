import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TravelExperience } from "@/components/travel/TravelExperience";
import { normalizeService } from "@/domain/experience/state";
import { useI18n } from "@/i18n";

const searchSchema = z.object({
  service: z.enum(["esim", "lounge"]).catch("esim").default("esim"),
});

export const Route = createFileRoute("/_authenticated/legacy-v1/en/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Travely | Travel eSIM and Airport Lounges" },
      {
        name: "description",
        content: "Discover travel eSIM plans and airport lounge options for your trip.",
      },
      { property: "og:title", content: "Travely | Travel eSIM and Airport Lounges" },
      {
        property: "og:description",
        content: "Discover travel eSIM plans and airport lounge options for your trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://wanderlust-core.lovable.app/en" }],
  }),
  component: EnglishHomepage,
});

function EnglishHomepage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { locale, setLocale } = useI18n();
  const service = normalizeService(search.service);

  useEffect(() => {
    if (locale !== "en") setLocale("en");
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