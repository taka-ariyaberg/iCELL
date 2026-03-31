import { ConfigInput } from '../services/apiClient';

export const IMPORT_SESSION_KEYS = [
  'lastUploadedConfigFile',
  'lastUploadedCellLayoutFile',
  'lastUploadedDyeLayoutFile',
  'lastUploadedMetaDyeFile',
] as const;

type ParsedMatrix = {
  rows: string[];
  columns: number[];
  values: Record<string, string>;
};

type ImportSessionData = {
  config: ConfigInput;
  wells: Record<string, string>;
  groups: Record<string, string[]>;
  dyePrograms: Record<string, string>;
  files: {
    config: string;
    cellLayout: string;
    dyeLayout?: string;
    metaDye?: string;
  };
};

function parseCsvLine(line: string): string[] {
  return line.split(',').map(value => value.trim());
}

function parseMatrixCsv(text: string): ParsedMatrix {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('Uploaded matrix CSV is empty.');
  }

  const headers = parseCsvLine(lines[0]);
  if (headers[0] !== 'row_name') {
    throw new Error(`Matrix CSV must start with row_name. Found ${headers[0] || 'empty header'}.`);
  }

  const columns = headers.slice(1).map(value => Number(value));
  const rows: string[] = [];
  const values: Record<string, string> = {};

  lines.slice(1).forEach(line => {
    const cells = parseCsvLine(line);
    const rowName = cells[0]?.toUpperCase();
    if (!rowName) return;
    rows.push(rowName);
    columns.forEach((column, index) => {
      values[`${rowName}${column}`] = cells[index + 1] ?? '';
    });
  });

  return { rows, columns, values };
}

function inferPlateType(config: Record<string, any>, matrix: ParsedMatrix): string {
  if (typeof config.plate_type === 'string' && config.plate_type.length > 0) {
    return config.plate_type;
  }

  if (config.plate?.rows && config.plate?.columns) {
    const dims = `${config.plate.rows.length},${config.plate.columns.length}`;
    const standard = new Map<string, string>([
      ['2,3', '6_well'],
      ['3,4', '12_well'],
      ['4,6', '24_well'],
      ['6,8', '48_well'],
      ['8,12', '96_well'],
      ['16,24', '384_well'],
      ['32,48', '1536_well'],
    ]);
    return standard.get(dims) || dims;
  }

  const dims = `${matrix.rows.length},${matrix.columns.length}`;
  const standard = new Map<string, string>([
    ['2,3', '6_well'],
    ['3,4', '12_well'],
    ['4,6', '24_well'],
    ['6,8', '48_well'],
    ['8,12', '96_well'],
    ['16,24', '384_well'],
    ['32,48', '1536_well'],
  ]);
  return standard.get(dims) || dims;
}

function toFrontendConfig(config: Record<string, any>, cellMatrix: ParsedMatrix): ConfigInput {
  const finalWellVolume = Number(config.seeding?.final_well_volume_ul ?? 40.0);
  return {
    project_name: String(config.project?.name ?? 'iCELL'),
    run_name: String(config.project?.run_name ?? 'Uploaded Run'),
    plate_type: inferPlateType(config, cellMatrix),
    mode: config.mode === 'dye' ? 'dye' : 'no_dye',
    stock_cell_concentration: Number(config.seeding?.stock_cell_concentration_cells_per_ml ?? 5000000),
    overage_fraction: Number(config.seeding?.overage_fraction ?? 0.30),
    num_plates: Number(config.num_plates ?? 1),
    final_well_volume_ul: finalWellVolume,
    dead_volume_cells_ul: Number(config.dead_volume?.cell_suspension_ul ?? 2000.0),
    dead_volume_dye_ul: Number(config.dead_volume?.dye_ul ?? 500.0),
  };
}

export async function prepareImportSessionData(formData: FormData): Promise<ImportSessionData> {
  const configFile = formData.get('config_file');
  const cellLayoutFile = formData.get('cell_layout');
  const dyeLayoutFile = formData.get('dye_layout');
  const metaDyeFile = formData.get('meta_dye');

  if (!(configFile instanceof File) || !(cellLayoutFile instanceof File)) {
    throw new Error('Import requires config.json and cell_layout.csv.');
  }

  const [configText, cellLayoutText, dyeLayoutText, metaDyeText] = await Promise.all([
    configFile.text(),
    cellLayoutFile.text(),
    dyeLayoutFile instanceof File ? dyeLayoutFile.text() : Promise.resolve(undefined),
    metaDyeFile instanceof File ? metaDyeFile.text() : Promise.resolve(undefined),
  ]);

  const configJson = JSON.parse(configText) as Record<string, any>;
  const cellMatrix = parseMatrixCsv(cellLayoutText);
  const dyeMatrix = dyeLayoutText ? parseMatrixCsv(dyeLayoutText) : null;

  const wells: Record<string, string> = {};
  const groupsData: Record<string, string[]> = {};

  Object.entries(cellMatrix.values).forEach(([well, rawValue]) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return;
    const groupName = `${numericValue.toLocaleString()} cells/well`;
    wells[well] = groupName;
    if (!groupsData[groupName]) groupsData[groupName] = [];
    groupsData[groupName].push(well);
  });

  const dyePrograms: Record<string, string> = {};
  if (dyeMatrix) {
    Object.entries(dyeMatrix.values).forEach(([well, rawValue]) => {
      const trimmed = rawValue.trim();
      if (trimmed) {
        dyePrograms[well] = trimmed;
      }
    });
  }

  return {
    config: toFrontendConfig(configJson, cellMatrix),
    wells,
    groups: groupsData,
    dyePrograms,
    files: {
      config: configText,
      cellLayout: cellLayoutText,
      dyeLayout: dyeLayoutText,
      metaDye: metaDyeText,
    },
  };
}