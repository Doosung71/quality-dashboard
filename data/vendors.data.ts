import type { VendorsData } from "@/types/vendor";
import raw from "./vendors.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against VendorsData shape manually; cast is intentional.
export const vendorsData = raw as unknown as VendorsData;
