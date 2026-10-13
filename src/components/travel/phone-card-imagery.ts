import apple from "@/assets/compatibility-apple.webp";
import samsung from "@/assets/compatibility-samsung.webp";
import google from "@/assets/compatibility-google.webp";
import xiaomi from "@/assets/compatibility-xiaomi.webp";
import poco from "@/assets/compatibility-poco.webp";
import redmi from "@/assets/compatibility-redmi.webp";
import oppo from "@/assets/compatibility-oppo.webp";
import oneplus from "@/assets/compatibility-oneplus.webp";
import motorola from "@/assets/compatibility-motorola.webp";
import honor from "@/assets/compatibility-honor.webp";
import huawei from "@/assets/compatibility-huawei.webp";
import nothing from "@/assets/compatibility-nothing.webp";

const BRAND_IMAGES: Readonly<Record<string, string>> = {
  apple, samsung, google, xiaomi, poco, redmi, oppo, oneplus, motorola, honor, huawei, nothing,
};

/** Original representative illustrations only, never verified exact-model photography. */
export function phoneCardImage(brand: string | null | undefined): string | null {
  const key = brand?.trim().toLowerCase();
  return key ? BRAND_IMAGES[key] ?? null : null;
}