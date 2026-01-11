/**
 * CSV utilities
 */

export function parse(csv: string, delimiter = ","): string[][] {
  return csv.split("
").map(row => row.split(delimiter));
}

export function stringify(data: string[][], delimiter = ","): string {
  return data.map(row => row.join(delimiter)).join("
");
}

export function toObjects<T>(csv: string, delimiter = ","): T[] {
  const rows = parse(csv, delimiter);
  const headers = rows[0];
  return rows.slice(1).map(row => {
    return headers.reduce((obj, header, i) => {
      obj[header as keyof T] = row[i] as T[keyof T];
      return obj;
    }, {} as T);
  });
}

export default { parse, stringify, toObjects };

