export function serializeRecordsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }

  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }

    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const headers: string[] = [];
  const seen = new Set<string>();

  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });

  const lines = [
    headers.map(header => escapeCsvValue(header)).join(','),
    ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(',')),
  ];

  return `${lines.join('\n')}\n`;
}
