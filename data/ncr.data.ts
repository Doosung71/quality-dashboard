import type { NCRsData } from "@/types/ncr";
import raw from "./ncr.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against NCRsData shape manually; cast is intentional.
export const ncrsData = raw as unknown as NCRsData;
