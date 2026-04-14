export interface ProtocolInstructionSection {
  title: string;
  lines: string[];
}

export interface ProtocolInstructionStep {
  number: string;
  title: string;
  details: string[];
}

export interface ProtocolSummaryEntry {
  label: string;
  value: string;
}

export function stripPlatePrefix(well: string): string {
  return well.replace(/^P\d+-/, '');
}

export function normalizeProtocolInstructions(
  instructions: string,
  numPlates: number,
): string {
  if (numPlates > 1) return instructions;
  return instructions.replace(/\bP\d+-([A-Z]+\d+)\b/g, '$1');
}

export function parseProtocolSections(
  instructions: string,
): ProtocolInstructionSection[] {
  const lines = instructions.replace(/\r\n/g, '\n').split('\n');
  const sections: ProtocolInstructionSection[] = [];
  let current: ProtocolInstructionSection | null = null;

  const pushCurrent = () => {
    if (current && (current.title || current.lines.some((line) => line.trim() !== ''))) {
      sections.push(current);
    }
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const next = lines[index + 1] ?? '';
    const isHeading = line.trim() !== '' && /^=+$/.test(next.trim());

    if (isHeading) {
      pushCurrent();
      current = { title: line.trim(), lines: [] };
      index += 1;
      continue;
    }

    if (!current) {
      current = { title: 'Protocol', lines: [] };
    }

    current.lines.push(line);
  }

  pushCurrent();
  return sections;
}

export function parseProtocolSteps(
  lines: string[],
): { intro: string[]; steps: ProtocolInstructionStep[] } {
  const intro: string[] = [];
  const steps: ProtocolInstructionStep[] = [];
  let currentStep: ProtocolInstructionStep | null = null;

  const pushStep = () => {
    if (currentStep) {
      steps.push(currentStep);
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      pushStep();
      currentStep = {
        number: numberedMatch[1],
        title: numberedMatch[2],
        details: [],
      };
      return;
    }

    if (currentStep) {
      currentStep.details.push(trimmed);
    } else {
      intro.push(trimmed);
    }
  });

  pushStep();
  return { intro, steps };
}

export function splitProtocolDetail(detail: string): ProtocolSummaryEntry | null {
  const separatorIndex = detail.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= detail.length - 1) return null;
  return {
    label: detail.slice(0, separatorIndex).trim(),
    value: detail.slice(separatorIndex + 1).trim(),
  };
}

export function parseProtocolSummary(lines: string[]): ProtocolSummaryEntry[] {
  return lines
    .map((line) => splitProtocolDetail(line.trim()))
    .filter((entry): entry is ProtocolSummaryEntry => Boolean(entry));
}

export function parseWellList(raw: unknown): string[] {
  const unique = new Set<string>();
  const wells = String(raw ?? '')
    .split(',')
    .map((well) => stripPlatePrefix(well.trim()))
    .filter(Boolean);

  wells.forEach((well) => unique.add(well));
  return Array.from(unique);
}

export function mergeProtocolDetails(details: string[]): string[] {
  const merged: string[] = [];

  for (let index = 0; index < details.length; index++) {
    const current = details[index].replace(/^- /, '').trim();
    if (!current) continue;

    const next = details[index + 1]?.replace(/^- /, '').trim() ?? '';

    if (/^Mix\b/i.test(current) && /^with\b/i.test(next)) {
      merged.push(`${current} ${next}`);
      index += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}
