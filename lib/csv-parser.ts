export function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let row = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      row += '"';
      i++; // skip next quote
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
      row += '"';
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      if (row.trim()) lines.push(row);
      row = "";
    } else {
      row += char;
    }
  }
  if (row.trim()) lines.push(row);

  if (lines.length < 2) return [];

  // Parse a single line into columns
  function parseLine(line: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cols.push(cur.trim());
    return cols;
  }

  const headers = parseLine(lines[0]);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : "";
    });
    results.push(obj);
  }

  return results;
}
