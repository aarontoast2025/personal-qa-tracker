function parseCsvRfc4180(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote inside quoted field ("") -> single quote
          currentField += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Opening quote
        insideQuotes = true;
      } else if (char === ",") {
        // End of field
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.some((f) => f.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.some((f) => f.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim())) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : "";
    });
    return obj;
  });
}

async function test() {
  const sheetId = "15KNHO7P5aafxWbY-t1QZzjKEIPvLDQSEslu9npQbgP4";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Assignments`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsvRfc4180(text);
  console.log("Total parsed rows:", rows.length);
  if (rows.length > 0) {
    console.log("Row 0 ID:", rows[0].ID);
    console.log("Row 0 Date:", rows[0].Date);
    console.log("Row 0 QA Email:", rows[0]["QA Email"]);
    console.log("Row 0 Agent Email:", rows[0]["Agent Email"]);
    console.log("Row 0 Rubric ID:", rows[0]["Rubric ID"]);
    console.log("Row 0 Status:", rows[0].Status);
    console.log("Row 0 Assigned By:", rows[0]["Assigned By"]);
    console.log("Row 0 Evaluation Type:", rows[0]["Evaluation Type"]);
    console.log("Row 0 Timestamp:", rows[0].Timestamp);
    console.log("Row 0 Agent Snapshot is valid JSON?", !!JSON.parse(rows[0]["Agent Snapshot"]));
  }
}

test();
