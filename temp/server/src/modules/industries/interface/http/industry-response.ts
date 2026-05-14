import type { IndustryRecord } from "../../domain/industry-record";

export interface IndustryResponse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export function toIndustryResponse(industry: IndustryRecord): IndustryResponse {
  return {
    id: industry.id,
    code: industry.code,
    name: industry.name,
    isActive: industry.isActive,
    createdAt: industry.createdAt.toISOString(),
    updatedAt: industry.updatedAt.toISOString(),
    deletedAt: industry.deletedAt ? industry.deletedAt.toISOString() : null,
  };
}
