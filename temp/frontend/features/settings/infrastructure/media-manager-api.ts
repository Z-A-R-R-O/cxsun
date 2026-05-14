import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

export type MediaVisibility = "private" | "public";

export interface MediaItemRecord {
  readonly downloadPath?: string;
  readonly fileName: string;
  readonly folder: string;
  readonly mimeType: string | null;
  readonly path: string;
  readonly publicUrl?: string;
  readonly size: number;
  readonly updatedAt: string;
  readonly visibility: MediaVisibility;
}

export async function listMedia(params: {
  readonly companyId: string;
  readonly folder?: string;
  readonly signal?: AbortSignal;
  readonly visibility: MediaVisibility;
}) {
  const response = await authFetch(
    `${getRequiredApiUrl()}/media?companyId=${encodeURIComponent(params.companyId)}&visibility=${params.visibility}&folder=${encodeURIComponent(params.folder ?? "")}`,
    {
      headers: { Accept: "application/json" },
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Media list request failed with status ${response.status}.`);
  }

  return ((await response.json()) as { readonly items?: readonly MediaItemRecord[] }).items ?? [];
}

export async function uploadMedia(params: {
  readonly companyId: string;
  readonly file: File;
  readonly folder?: string;
  readonly overwrite?: boolean;
  readonly visibility: MediaVisibility;
}) {
  const response = await authFetch(
    `${getRequiredApiUrl()}/media/upload?companyId=${encodeURIComponent(params.companyId)}`,
    {
      body: JSON.stringify({
        contentBase64: await fileToBase64(params.file),
        fileName: params.file.name,
        folder: params.folder ?? "",
        overwrite: params.overwrite ?? false,
        visibility: params.visibility,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 409
        ? "A file with the same name already exists."
        : `Media upload failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as MediaItemRecord;
}

export async function deleteMedia(params: {
  readonly companyId: string;
  readonly path: string;
  readonly visibility: MediaVisibility;
}) {
  const response = await authFetch(
    `${getRequiredApiUrl()}/media?companyId=${encodeURIComponent(params.companyId)}&visibility=${params.visibility}&path=${encodeURIComponent(params.path)}`,
    {
      headers: { Accept: "application/json" },
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(`Media delete failed with status ${response.status}.`);
  }

  return (await response.json()) as { readonly deleted: boolean };
}

export function privateMediaUrl(downloadPath: string) {
  return `${getRequiredApiUrl()}${downloadPath}`;
}

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      resolve(result.split(",").at(-1) ?? result);
    };
    reader.readAsDataURL(file);
  });
}
