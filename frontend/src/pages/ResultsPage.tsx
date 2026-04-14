import React, { useState } from 'react';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { usePlateStore } from '../store/plateStore';
import { ConfigInput } from '../services/apiClient';
import { generateCellLayout, generateDyeLayout, generateMetaDye, downloadFile } from '../utils/exportUtils';
import { buildExportBaseName, serializeRecordsToCsv } from '../utils/csvExport';
import '../styles/ResultsPage.css';

interface ResultsPageProps {
  instructions: string;
  seedingSummary: Record<string, unknown>[];
  dyeSummary?: Record<string, unknown>[];
  formattedSeedingSummary?: Record<string, unknown>[];
  formattedDyeSummary?: Record<string, unknown>[];
  imetaRows?: Record<string, unknown>[];
  plateType?: string;
  numPlates?: number;
  mode?: string;
  configData?: ConfigInput | null;
  onBackClick: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  instructions,
  seedingSummary,
  dyeSummary,
  formattedSeedingSummary = [],
  formattedDyeSummary = [],
  imetaRows = [],
  plateType = '96',
  numPlates = 1,
  mode = 'no_dye',
  configData = null,
  onBackClick,
}) => {
  const { groups: storeGroups, dyePrograms: storeDyePrograms } = usePlateStore();
  const [showDownloads, setShowDownloads] = useState(false);

  // Reconstruct wells and groups from sessionStorage (saved before processing)
  const storedWells = sessionStorage.getItem('lastProcessedWells');
  const storedGroups = sessionStorage.getItem('lastProcessedGroups');
  const storedDyeAssignments = sessionStorage.getItem('lastProcessedDyeAssignments');
  
  const wells = storedWells ? JSON.parse(storedWells) : {};
  const groupsData = storedGroups 
    ? Object.entries(JSON.parse(storedGroups)).reduce((acc, [name, wellArray]: [string, any]) => {
        acc[name] = new Set(wellArray as string[]);
        return acc;
      }, {} as Record<string, Set<string>>)
    : {};
  const dyePrograms = storedDyeAssignments ? JSON.parse(storedDyeAssignments) : storeDyePrograms;
  const uploadedConfigFile = sessionStorage.getItem('lastUploadedConfigFile');
  const uploadedCellLayoutFile = sessionStorage.getItem('lastUploadedCellLayoutFile');
  const uploadedDyeLayoutFile = sessionStorage.getItem('lastUploadedDyeLayoutFile');
  const uploadedMetaDyeFile = sessionStorage.getItem('lastUploadedMetaDyeFile');
  const exportBaseName = buildExportBaseName(
    configData?.project_name,
    configData?.plate_id,
  );

  const buildReimportConfig = () => {
    if (!configData) return null;
    return {
      project: {
        name: configData.project_name,
        plate_id: configData.plate_id,
        run_name: configData.plate_id,
        seeding_date: configData.seeding_date ?? '',
      },
      mode: configData.mode,
      plate_type: configData.plate_type,
      num_plates: configData.num_plates,
      dead_volume: {
        cell_suspension_ul: configData.dead_volume_cells_ul ?? 2000.0,
        dye_ul: configData.dead_volume_dye_ul ?? 500.0,
      },
      seeding_modes: {
        no_dye: {
          final_well_volume_ul: configData.final_well_volume_ul ?? 40.0,
          cell_suspension_dispense_ul: configData.final_well_volume_ul ?? 40.0,
          media_dispense_ul: 0.0,
          dye_mastermix_dispense_ul_per_well: 0.0,
          description: `Full ${configData.final_well_volume_ul ?? 40.0} µL well with cell suspension only (no dye)`,
        },
        dye: {
          final_well_volume_ul: configData.final_well_volume_ul ?? 40.0,
          cell_suspension_dispense_ul: (configData.final_well_volume_ul ?? 40.0) / 2,
          media_dispense_ul: 0.0,
          dye_mastermix_dispense_ul_per_well: (configData.final_well_volume_ul ?? 40.0) / 2,
          description: `${(configData.final_well_volume_ul ?? 40.0) / 2} µL cell suspension + ${(configData.final_well_volume_ul ?? 40.0) / 2} µL dye mastermix`,
        },
      },
      seeding: {
        final_well_volume_ul: configData.final_well_volume_ul ?? 40.0,
        cell_suspension_dispense_ul: configData.mode === 'dye'
          ? (configData.final_well_volume_ul ?? 40.0) / 2
          : (configData.final_well_volume_ul ?? 40.0),
        media_dispense_ul: 0.0,
        stock_cell_concentration_cells_per_ml: configData.stock_cell_concentration,
        min_cell_handling_volume_ul: 20.0,
        overage_fraction: configData.overage_fraction,
      },
      dye: {
        enabled: configData.mode === 'dye',
        meta_dye_csv: 'meta_dye.csv',
        mastermix_dispense_ul_per_well: configData.mode === 'dye' ? (configData.final_well_volume_ul ?? 40.0) / 2 : 0.0,
        min_dye_handling_volume_ul: 1.0,
      },
      paths: {
        input_dir: 'data/input',
        cell_layout_csv: 'cell_layout.csv',
        dye_layout_csv: 'dye_layout.csv',
        output_tables_dir: 'data/output/tables',
        output_instructions_dir: 'data/output/instructions',
        output_logs_dir: 'data/output/logs',
      },
    };
  };

  const handleDownloadConfig = () => {
    const config = uploadedConfigFile
      ? uploadedConfigFile
      : JSON.stringify(buildReimportConfig(), null, 2);
    downloadFile(config, `${exportBaseName}__config.json`, 'application/json');
  };

  const handleDownloadCellLayout = () => {
    const csv = uploadedCellLayoutFile || generateCellLayout({
      plateType,
      wells,
      groups: storeGroups,
    });
    downloadFile(csv, `${exportBaseName}__cell_layout.csv`, 'text/csv');
  };

  const handleDownloadDyeLayout = () => {
    const csv = uploadedDyeLayoutFile || generateDyeLayout({
      plateType,
      wells,
      dyePrograms,
    });
    downloadFile(csv, `${exportBaseName}__dye_layout.csv`, 'text/csv');
  };

  const handleDownloadMetaDye = () => {
    const storedPrograms = sessionStorage.getItem('dyePrograms');
    const programs = storedPrograms ? JSON.parse(storedPrograms) : [];
    const csv = uploadedMetaDyeFile || generateMetaDye(programs);
    downloadFile(csv, `${exportBaseName}__meta_dye.csv`, 'text/csv');
  };

  const handleDownloadIMeta = () => {
    if (imetaRows.length === 0) return;
    const csv = serializeRecordsToCsv(imetaRows);
    downloadFile(csv, `${exportBaseName}__iMETA.csv`, 'text/csv');
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <button onClick={onBackClick} className="back-btn">← Back</button>
        <h2 className="page-title">✅ Calculation Complete</h2>
      </div>

      <div className="results-content">
        <ResultsDisplay
          instructions={instructions}
          seedingSummary={seedingSummary}
          dyeSummary={dyeSummary}
          formattedSeedingSummary={formattedSeedingSummary}
          formattedDyeSummary={formattedDyeSummary}
          exportBaseName={exportBaseName}
          onDownloadIMeta={imetaRows.length > 0 ? handleDownloadIMeta : null}
          hasIMetaDownload={imetaRows.length > 0}
          plateType={plateType}
          numPlates={numPlates}
          mode={mode}
          wells={wells}
          groups={groupsData}
          dyePrograms={dyePrograms}
        />
      </div>

      {/* Download Input Files Section */}
      <div className="download-section">
        <button 
          onClick={() => setShowDownloads(!showDownloads)}
          className="download-toggle-btn"
        >
          {showDownloads ? '▼ Hide' : '▶ Show'} Download Input Files for Re-import
        </button>

        {showDownloads && (
          <div className="download-files">
            <h3>📥 All Input Files</h3>
            <p className="download-info">
              Download all files to reimport this exact protocol later:
            </p>
            <div className="download-buttons">
              <button 
                onClick={handleDownloadConfig}
                className="download-btn config-btn"
              >
                ⚙️ config.json
              </button>
              <button 
                onClick={handleDownloadCellLayout}
                className="download-btn cell-layout-btn"
              >
                📄 cell_layout.csv
              </button>
              {mode === 'dye' && (
                <>
                  <button 
                    onClick={handleDownloadDyeLayout}
                    className="download-btn dye-layout-btn"
                  >
                    📄 dye_layout.csv
                  </button>
                  <button 
                    onClick={handleDownloadMetaDye}
                    className="download-btn meta-dye-btn"
                  >
                    🧬 meta_dye.csv
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
