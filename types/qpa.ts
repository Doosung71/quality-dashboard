export type QpaResult = "PASS" | "FAIL" | "TBD"
export type QpaLevel = "A" | "B" | "C" | "D" | ""
export type QpaStatus = "InProgress" | "Completed"
export type QpaFindingStatus = "OPEN" | "IN_PROGRESS" | "CLOSED"

export interface QpaAudit {
  id: string
  qpaNo: string
  vendorId: string
  vendorName: string
  location: string
  partName: string
  auditDate: string
  auditorNames: string
  templateVersion: string
  totalPotential: number
  totalScore: number
  totalPercent: number
  level: QpaLevel
  result: QpaResult
  status: QpaStatus
  createdById: string
  createdAt: string
  updatedAt: string
  items?: QpaAuditItem[]
  findings?: QpaFinding[]
  _count?: { items: number; findings: number }
}

export interface QpaAuditItem {
  id: string
  auditId: string
  itemNo: number
  category: string
  subCategory: string
  isKey: boolean
  checkItem: string
  criteria: string
  potential: number
  score: number
  isNA: boolean
  comment: string
  evidence: string
  createdAt: string
  updatedAt: string
}

export interface QpaFinding {
  id: string
  auditId: string
  seq: number
  category: string
  finding: string
  action: string
  responsible: string
  dueDate: string | null
  status: QpaFindingStatus
  createdAt: string
  updatedAt: string
}

export interface QpaListItem extends Omit<QpaAudit, "items" | "findings"> {
  _count: { items: number; findings: number }
}
