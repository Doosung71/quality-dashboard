import type { HRData } from "@/types/hr";
import raw from "./hr.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against HRData shape manually; cast is intentional.
export const hrData = raw as unknown as HRData;
