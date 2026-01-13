// Compression utilities
export const compress = async (data: string): Promise<ArrayBuffer> => {
  const stream = new Blob([data]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressedStream);
  return response.arrayBuffer();
};

export const decompress = async (data: ArrayBuffer): Promise<string> => {
  const stream = new Blob([data]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  return response.text();
};

export const estimateCompressedSize = (data: string): number => {
  const utf8 = new TextEncoder().encode(data);
  return Math.ceil(utf8.length * 0.6);
};

export default { compress, decompress, estimateCompressedSize };
