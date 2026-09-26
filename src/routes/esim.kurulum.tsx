import { createFileRoute, useRouter } from "@tanstack/react-router";
import { EsimInstallationPage } from "@/components/design-v2/EsimInstallationPage";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const FALLBACK = {
  tr: { title: "Kurulum rehberi yüklenemedi.", retry: "Tekrar dene", back: "Geri dön" },
  de: { title: "Die Installationsanleitung konnte nicht geladen werden.", retry: "Erneut versuchen", back: "Zurück" },
  en: { title: "The installation guide could not be loaded.", retry: "Try again", back: "Go back" },
} as const;

function GuideError({ reset }: { reset: () => void }) {
  const { locale } = useI18n();
  const router = useRouter();
  const c = FALLBACK[locale] ?? FALLBACK.tr;
  return (
    <main className="mx-auto grid min-h-[60svh] max-w-md place-items-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h1 className="font-display text-xl font-bold">{c.title}</h1>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="cta" className="min-h-11" onClick={() => { reset(); void router.invalidate(); }}>{c.retry}</Button>
          <Button variant="outline" className="min-h-11" onClick={() => router.history.back()}>{c.back}</Button>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/esim/kurulum")({
  validateSearch: (search: Record<string, unknown>) => ({ platform: search['platform'] === "android" ? "android" as const : "ios" as const, brand: typeof search['brand'] === "string" ? search['brand'] : "" }),
  head: () => ({ meta: [
    { title: "eSIM kurulum rehberi | travely" },
    { name: "description", content: "iPhone ve Android için adım adım eSIM kurulum rehberi. Gerçek QR kodunu hesabında bul." },
    { property: "og:title", content: "eSIM kurulum rehberi | travely" },
    { property: "og:description", content: "iPhone ve Android için adım adım eSIM kurulum rehberi. Gerçek QR kodunu hesabında bul." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: ({ reset }) => <GuideError reset={reset} />,
  component: GuideRoute,
});

function GuideRoute() {
  return <EsimInstallationPage initialPlatform={Route.useSearch().platform} />;
}
