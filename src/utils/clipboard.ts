/**
 * Clipboard utilities
 * @module utils/clipboard
 */

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function paste(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  return copy(text);
}

export async function readFromClipboard(): Promise<string> {
  return paste();
}

export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function copyRichText(html: string, plainText?: string): Promise<boolean> {
  try {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([plainText || html.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      })
    ]);
    return true;
  } catch {
    return false;
  }
}

export const clipboard = {
  copy,
  paste,
  copyToClipboard,
  readFromClipboard,
  copyImage,
  copyRichText,
};

export default clipboard;
