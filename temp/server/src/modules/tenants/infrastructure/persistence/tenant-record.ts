export interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}
