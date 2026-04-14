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

function sanitizeFilePart(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '') || fallback;
}

export function buildExportBaseName(projectName?: string, plateId?: string, date?: string): string {
  const exportDate = date || new Date().toISOString().split('T')[0];
  const safeProject = sanitizeFilePart(projectName || 'iCELL', 'iCELL');
  const safePlateId = sanitizeFilePart(plateId || 'plate', 'plate');
  return `${safeProject}__${safePlateId}__${exportDate}`;
}
