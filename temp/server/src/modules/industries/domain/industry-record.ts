export interface IndustryRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}
