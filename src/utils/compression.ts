/**
 * Compression Utility
 */
export async function compress(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(encoder.encode(data));
  writer.close();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Uint8Array(chunks.reduce<number[]>((acc, chunk) => [...acc, ...Array.from(chunk)], []));
}

export async function decompress(data: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength));
  writer.close();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new TextDecoder().decode(new Uint8Array(chunks.reduce<number[]>((acc, chunk) => [...acc, ...Array.from(chunk)], [])));
}
