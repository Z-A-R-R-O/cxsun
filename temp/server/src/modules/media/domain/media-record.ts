export const mediaVisibilities = ["private", "public"] as const;

export type MediaVisibility = (typeof mediaVisibilities)[number];

export interface MediaRecord {
  readonly fileName: string;
  readonly folder: string;
  readonly mimeType: string | null;
  readonly path: string;
  readonly size: number;
  readonly updatedAt: string;
  readonly visibility: MediaVisibility;
  readonly downloadPath?: string;
  readonly publicUrl?: string;
}

export interface MediaUploadInput {
  readonly contentBase64?: unknown;
  readonly fileName?: unknown;
  readonly folder?: unknown;
  readonly overwrite?: unknown;
  readonly visibility?: unknown;
}
