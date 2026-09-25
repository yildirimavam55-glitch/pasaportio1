import { createFileRoute } from "@tanstack/react-router";
import { PublicSupportPage } from "@/components/support/PublicSupportPage";

// Same support page as /destek (WhatsApp first), rendered in V2.
export const Route = createFileRoute("/destek")({
  head: () => ({
    meta: [
      { title: "Destek | travely" },
      { name: "description", content: "WhatsApp ve e-posta ile travely destek ekibine ulaşın." },
      { property: "og:title", content: "Destek | travely" },
      { property: "og:description", content: "WhatsApp ve e-posta ile travely destek ekibine ulaşın." },
    ],
    links: [{ rel: "canonical", href: "https://wanderlust-core.lovable.app/destek" }],
  }),
  component: PublicSupportPage,
});
