import { z } from "zod";

const ISO_RE = /^[A-Z]{2}$/;
const KEY_RE = /^(U|\d+(\.\d+)?)\|\d+$/;

/** Shape of retrieved Airalo country checks sent back by the Admin client for planning/commit. */
export const airaloCheckSchema = z.array(z.discriminatedUnion("status", [
  z.object({ iso: z.string().regex(ISO_RE), status: z.literal("OK"), source: z.string().max(200), excludedVoice: z.number().int().min(0).max(500),
    nonEur: z.array(z.string().regex(KEY_RE)).max(200), packages: z.array(z.object({ key: z.string().regex(KEY_RE), price: z.number().positive().max(1000) })).max(200) }),
  z.object({ iso: z.string().regex(ISO_RE), status: z.literal("RESEARCH_FAILED"), source: z.string().max(200), reason: z.string().max(200) }),
])).max(250);
