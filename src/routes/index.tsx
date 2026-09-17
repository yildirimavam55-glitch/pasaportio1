import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PlaceholderSection } from "@/components/AppShell";
import { useI18n } from "@/i18n";
import { getServiceConfig } from "@/lib/platform.functions";
import { visibleServices } from "@/domain/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seyahat Servisleri Platformu | eSIM & Lounge" },
      {
        name: "description",
        content:
          "eSIM ve havalimanı lounge hizmetlerini tek platformda birleştiren modüler seyahat servisleri altyapısı.",
      },
      { property: "og:title", content: "Seyahat Servisleri Platformu | eSIM & Lounge" },
      {
        property: "og:description",
        content: "eSIM ve havalimanı lounge hizmetleri tek çatı altında.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServiceConfig(),
  });

  const active = visibleServices(services ?? []);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">{t("home.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("home.subtitle")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {active.map((service) => (
          <Link
            key={service.service_type}
            to={service.service_type === "ESIM" ? "/esim" : "/lounge"}
            className="rounded-xl border border-border p-5 transition-colors hover:bg-accent"
          >
            <span className="text-base font-semibold">
              {service.service_type === "ESIM" ? t("nav.esim") : t("nav.lounge")}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {t("common.comingSoon")}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        <PlaceholderSection
          title={t("common.phase")}
          description="Çok servisli mimari, sağlayıcı adaptörleri, fiyatlandırma, sipariş ve seyahat modelleri hazır."
          items={["ESIM · aktif", "LOUNGE · aktif", "CAR_RENTAL · kapalı", "TRANSFER · kapalı"]}
        />
      </div>
    </AppShell>
  );
}
