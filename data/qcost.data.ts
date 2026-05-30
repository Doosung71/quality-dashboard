import type { QCostData } from "@/types/qcost";
import raw from "./qcost.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against QCostData shape manually; cast is intentional.
export const qcostData = raw as unknown as QCostData;
