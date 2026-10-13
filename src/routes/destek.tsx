import { SITE_URL } from "@/domain/seo/paths";
import { createFileRoute } from "@tanstack/react-router";
import { PublicSupportPage } from "@/components/support/PublicSupportPage";

// Same support page as /destek (WhatsApp first), rendered in V2.
export const Route = createFileRoute("/destek")({
  head: () => ({
    meta: [
      { title: "Destek | pasaport.io" },
      { name: "description", content: "WhatsApp ve e-posta ile pasaport.io destek ekibine ulaşın." },
      { property: "og:title", content: "Destek | pasaport.io" },
      { property: "og:description", content: "WhatsApp ve e-posta ile pasaport.io destek ekibine ulaşın." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/destek` }],
  }),
  component: PublicSupportPage,
});
