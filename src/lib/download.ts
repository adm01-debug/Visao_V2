/**
 * Download utilities
 */

export function download(url: string, filename?: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  download(url, filename);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  downloadBlob(blob, filename);
}

export function downloadJSON(data: unknown, filename: string): void {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  downloadBlob(blob, filename);
}

export default { download, downloadBlob, downloadText, downloadJSON };

