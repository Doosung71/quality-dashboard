import type { KnowledgeRepositoryData } from "@/types/knowledge";
import raw from "./knowledge.json";

// JSON imports widen literal types, so satisfies can't verify union fields.
// Values are validated against KnowledgeRepositoryData shape manually; cast is intentional.
export const knowledgeRepositoryData = raw as unknown as KnowledgeRepositoryData;
