import type { FacilitiesData } from "@/types/facility";
import raw from "./facilities.json";

export const facilitiesData = raw as unknown as FacilitiesData;
