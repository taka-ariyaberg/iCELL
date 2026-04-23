function sanitizeFilePart(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  return trimmed
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '') || fallback;
}

function formatTimestampPart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDownloadTimestamp(date: Date = new Date()): string {
  const year = String(date.getFullYear());
  const month = formatTimestampPart(date.getMonth() + 1);
  const day = formatTimestampPart(date.getDate());
  const hours = formatTimestampPart(date.getHours());
  const minutes = formatTimestampPart(date.getMinutes());
  const seconds = formatTimestampPart(date.getSeconds());
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

export function buildDownloadBaseName(projectName?: string, plateId?: string): string {
  const safeProject = sanitizeFilePart(projectName || 'iCELL', 'iCELL');
  const safePlateId = sanitizeFilePart(plateId || 'plate', 'plate');
  return `${safeProject}_${safePlateId}`;
}

export function buildDownloadFilenameFromBase(
  baseName: string,
  artifact: string,
  extension: string,
  date: Date = new Date(),
): string {
  const safeBase = sanitizeFilePart(baseName, 'download');
  const safeArtifact = sanitizeFilePart(artifact, 'file');
  const safeExtension = extension.replace(/^\./, '') || 'txt';
  return `iCELL_${safeBase}_${safeArtifact}_${formatDownloadTimestamp(date)}.${safeExtension}`;
}

export function buildDownloadFilename(
  artifact: string,
  extension: string,
  projectName?: string,
  plateId?: string,
  date: Date = new Date(),
): string {
  return buildDownloadFilenameFromBase(
    buildDownloadBaseName(projectName, plateId),
    artifact,
    extension,
    date,
  );
}
