import { describe, expect, it } from "vitest";
import { defaultV2Page, sanitizeV2Page } from "../v2";

describe("Worldwide banner existing CMS media", () => {
  it("retains independent desktop and mobile media and crop settings", () => {
    const page = defaultV2Page("esim");
    const region = page.sections.find((section) => section.type === "REGION_DISCOVERY");
    if (!region) throw new Error("Missing region section");
    region.mediaId = "builtin:worldwide-window";
    region.mobileMediaId = "536a6bd7-2418-4668-8149-6b85bfd2b98d";
    region.imageDisplay = { zoom: 140, x: 35, y: 60, fit: "cover" };
    region.mobileImageDisplay = { zoom: 120, x: 76, y: 40, fit: "cover" };
    const saved = sanitizeV2Page(page, "esim").sections.find((section) => section.id === region.id);
    expect(saved?.mediaId).toBe("builtin:worldwide-window");
    expect(saved?.mobileMediaId).toBe(region.mobileMediaId);
    expect(saved?.imageDisplay).toEqual({ zoom: 140, x: 35, y: 60, fit: "cover" });
    expect(saved?.mobileImageDisplay).toEqual({ zoom: 120, x: 76, y: 40, fit: "cover" });
  });
});