import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export async function downloadPrintPdf(session: AuthSession, endpoint: string, printHtml: string, fallbackFileName: string) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    body: JSON.stringify({ printHtml }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`PDF download failed with status ${response.status}.`)

  const blob = await response.blob()
  const fileName = fileNameFromContentDisposition(response.headers.get("Content-Disposition")) ?? safePdfFileName(fallbackFileName)
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function fileNameFromContentDisposition(value: string | null) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(value ?? "")
  if (!match?.[1]) return null
  return decodeURIComponent(match[1]).trim() || null
}

function safePdfFileName(value: string) {
  const stem = value.replace(/[/\\?%*:|"<>]/g, "-").trim() || "document"
  return stem.toLowerCase().endsWith(".pdf") ? stem : `${stem}.pdf`
}
