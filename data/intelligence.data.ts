import type { IntelligenceData } from "@/types/intelligence";
import raw from "./intelligence.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against IntelligenceData shape manually; cast is intentional.
export const intelligenceData = raw as unknown as IntelligenceData;
