import axios from 'axios';

const DEV_PORTS = new Set(['3000', '3001', '3002', '3003', '5173']);
const isDevBrowser = typeof window !== 'undefined' && DEV_PORTS.has(window.location.port);
const browserRelativeApi = typeof window !== 'undefined' ? `${window.location.origin}/api` : undefined;

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (!isDevBrowser && browserRelativeApi) ||
  'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add error interceptor to capture detailed error messages
api.interceptors.response.use(
  response => response,
  error => {
    // Log full error details for debugging
    if (error.response?.data?.detail) {
      console.error('🔴 Backend Error Detail:', error.response.data.detail);
      error.message = error.response.data.detail;
    } else if (error.response?.data?.error) {
      console.error('🔴 Backend Error:', error.response.data.error);
      error.message = error.response.data.error;
    }
    return Promise.reject(error);
  }
);

export interface ConfigInput {
  project_name: string;
  plate_id: string;
  plate_type: string;
  mode: string;
  stock_cell_concentration: number;
  overage_fraction: number;
  num_plates: number;
  seeding_date?: string;
  final_well_volume_ul?: number;
  dead_volume_cells_ul?: number;
  dead_volume_dye_ul?: number;
}

// Dye program types — snake_case to match backend schema exactly
export interface DyeDefinitionInput {
  dye_name: string;
  stock_concentration: number;
  stock_concentration_unit: string;
  final_concentration: number;
  final_concentration_unit: string;
}

export interface DyeProgramInput {
  name: string;
  dyes: DyeDefinitionInput[];
}

export interface PlateLayoutInput {
  well_positions: Record<string, number>;
  dye_programs?: Record<string, string>;
  meta_dye_programs?: DyeProgramInput[];
}

export interface CalculationResult {
  status: string;
  instructions: string;
  seeding_summary: Record<string, unknown>[];
  dye_summary?: Record<string, unknown>[];
  formatted_seeding_summary?: Record<string, unknown>[];
  formatted_dye_summary?: Record<string, unknown>[];
  imeta_rows?: Record<string, unknown>[];
  error?: string;
}

export const runCalculation = async (
  config: ConfigInput,
  plateLayout: PlateLayoutInput
): Promise<CalculationResult> => {
  const response = await api.post<CalculationResult>('/run', {
    config,
    plates: plateLayout,
  });
  return response.data;
};

export const uploadCSVFiles = async (files: FormData): Promise<CalculationResult> => {
  const response = await api.post<CalculationResult>('/upload-csv', files, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
};
