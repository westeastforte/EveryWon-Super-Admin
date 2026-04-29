// Minimal RFC-4180-ish CSV parser. Handles:
//  - Quoted fields with embedded commas, newlines, and escaped quotes ("")
//  - CRLF or LF line endings
//  - BOM at the start of the file
//
// Not a full CSV library — but HIRA / data.go.kr exports are well-formed
// and this avoids pulling in a 50KB Papa Parse dependency.

export interface ParsedCsv {
  header: string[];
  rows: string[][];
}

export const parseCsv = (text: string): ParsedCsv => {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // \r\n — eat the \n on the next iteration via newline handling.
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Trailing field / row (no terminating newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  return { header, rows: rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")) };
};
