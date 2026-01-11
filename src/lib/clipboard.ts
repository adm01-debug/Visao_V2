/**
 * Clipboard utilities
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

export default { copy, paste, copyToClipboard, readFromClipboard };

