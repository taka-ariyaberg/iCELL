import React, { useMemo, useState } from 'react';
import '../styles/CSVUploader.css';

type UploadFileKey = 'config' | 'cell_layout' | 'dye_layout' | 'meta_dye';
type UploadFilesState = Record<UploadFileKey, File | null>;

interface CSVUploaderProps {
  files: UploadFilesState;
  onFilesChange: React.Dispatch<React.SetStateAction<UploadFilesState>>;
  onFilesSelected: (files: FormData) => void;
  isLoading?: boolean;
}

interface FileInfo {
  key: UploadFileKey;
  name: string;
  description: string;
  type: 'json' | 'csv';
  required: boolean;
  hint: string;
}

const FILE_SPECS: FileInfo[] = [
  {
    key: 'config',
    name: 'Configuration',
    description: 'Project name, plate type, seeding parameters, volumes',
    type: 'json',
    required: true,
    hint: 'Accepted: config.json',
  },
  {
    key: 'cell_layout',
    name: 'Cell Layout',
    description: 'Grid of target cells per well for each well position',
    type: 'csv',
    required: true,
    hint: 'Accepted: cell_layout.csv, cleo_cell_density_layout.csv',
  },
  {
    key: 'dye_layout',
    name: 'Dye Assignment',
    description: 'Assigns dye programs (e.g., CP_A, CP_B) to well positions',
    type: 'csv',
    required: false,
    hint: 'Accepted: dye_layout.csv',
  },
  {
    key: 'meta_dye',
    name: 'Dye Definitions',
    description: 'Dye program components and concentrations (stock & final)',
    type: 'csv',
    required: false,
    hint: 'Accepted: meta_dye.csv',
  },
];

// Template generators for each file type
const TEMPLATE_GENERATORS = {
  config: () => {
    return JSON.stringify({
      project: {
        name: "My Project",
        run_name: "Run 1"
      },
      mode: "no_dye",
      plate_type: "384_well",
      num_plates: 1,
      dead_volume: {
        cell_suspension_ul: 2000.0,
        dye_ul: 500.0
      },
      seeding_modes: {
        no_dye: {
          final_well_volume_ul: 40.0,
          cell_suspension_dispense_ul: 40.0,
          media_dispense_ul: 0.0,
          dye_mastermix_dispense_ul_per_well: 0.0,
          description: "Full 40 µL well with cell suspension only (no dye)"
        },
        dye: {
          final_well_volume_ul: 40.0,
          cell_suspension_dispense_ul: 20.0,
          media_dispense_ul: 0.0,
          dye_mastermix_dispense_ul_per_well: 20.0,
          description: "20 µL cell suspension + 20 µL dye mastermix"
        }
      },
      seeding: {
        final_well_volume_ul: 40.0,
        cell_suspension_dispense_ul: 40.0,
        media_dispense_ul: 0.0,
        stock_cell_concentration_cells_per_ml: 5000000,
        min_cell_handling_volume_ul: 20.0,
        overage_fraction: 0.3
      },
      dye: {
        enabled: false,
        meta_dye_csv: "meta_dye.csv",
        mastermix_dispense_ul_per_well: 20.0,
        min_dye_handling_volume_ul: 1.0
      },
      paths: {
        input_dir: "data/input",
        cell_layout_csv: "cell_layout.csv",
        dye_layout_csv: "dye_layout.csv",
        output_tables_dir: "data/output/tables",
        output_instructions_dir: "data/output/instructions",
        output_logs_dir: "data/output/logs"
      }
    }, null, 2);
  },
  cell_layout: () => {
    // 384-well plate: rows A–P (16 rows), columns 1–24
    const rows = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i)); // A–P
    const cols = 24;
    let csv = 'row_name,' + Array.from({length: cols}, (_, i) => i + 1).join(',') + '\n';
    for (const row of rows) {
      csv += row + ',' + Array(cols).fill('500').join(',') + '\n';
    }
    return csv;
  },
  dye_layout: () => {
    // 384-well plate: rows A–P (16 rows), columns 1–24
    const rows = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i)); // A–P
    const cols = 24;
    let csv = 'row_name,' + Array.from({length: cols}, (_, i) => i + 1).join(',') + '\n';
    for (const row of rows) {
      const cellValues: string[] = [];
      for (let col = 1; col <= cols; col++) {
        let value = '';
        // Example: CP_A to cols 2–7, CP_B to cols 13–18, for rows B–O
        if (row >= 'B' && row <= 'O') {
          if (col >= 2 && col <= 7) {
            value = 'CP_A';
          } else if (col >= 13 && col <= 18) {
            value = 'CP_B';
          }
        }
        cellValues.push(value);
      }
      csv += row + ',' + cellValues.join(',') + '\n';
    }
    return csv;
  },
  meta_dye: () => {
    return 'dye_program,dye_name,stock_concentration,stock_concentration_unit,final_concentration,final_concentration_unit\nCP_A,Hoechst_33342,10000,ug_per_ml,5,ug_per_ml\nCP_A,ConcanavalinA_Alexa488,1000,ug_per_ml,100,ug_per_ml\nCP_B,MitoTracker_DeepRed,1000,X,1,X\nCP_B,Phalloidin_Alexa555,1000,X,1,X\n';
  }
};

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  files,
  onFilesChange,
  onFilesSelected,
  isLoading = false,
}) => {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const uploadedCount = useMemo(
    () => Object.values(files).filter(Boolean).length,
    [files]
  );

  const requiredReady = Boolean(files.config && files.cell_layout);

  const handleDownloadTemplate = (key: string) => {
    const spec = FILE_SPECS.find(s => s.key === key);
    if (!spec) return;

    const generator = TEMPLATE_GENERATORS[key as keyof typeof TEMPLATE_GENERATORS];
    if (!generator) return;

    const content = generator();
    const mimeType = spec.type === 'json' ? 'application/json' : 'text/csv';
    const filename = spec.type === 'json' ? 'config.json' : `${key}.csv`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDragEnter = (e: React.DragEvent, key?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (key) setDragOverKey(key);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);
  };

  const handleDrop = (e: React.DragEvent, key?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);

    const droppedFiles = e.dataTransfer.files;
    if (key) handleFilesForKey(droppedFiles, key as UploadFileKey);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, key?: string) => {
    if (e.target.files) {
      if (key) handleFilesForKey(e.target.files, key as UploadFileKey);
      e.target.value = '';
    }
  };

  const handleFilesForKey = (fileList: FileList, key: UploadFileKey) => {
    if (fileList.length === 0) return;
    if (fileList.length > 1) {
      setMessage('Each upload slot accepts one file only. Choose a single file for that slot.');
      return;
    }

    const file = fileList[0];
    onFilesChange((currentFiles) => ({ ...currentFiles, [key]: file }));
    setMessage(null);
  };

  const handleClear = (key: UploadFileKey) => {
    onFilesChange((currentFiles) => ({ ...currentFiles, [key]: null }));
    setMessage(null);
  };

  const handleClearAll = () => {
    onFilesChange({
      config: null,
      cell_layout: null,
      dye_layout: null,
      meta_dye: null,
    });
    setMessage(null);
  };

  const handleSubmit = () => {
    if (!files.config || !files.cell_layout) {
      alert('Please upload at least Configuration (config.json) and Cell Layout (cell_layout.csv)');
      return;
    }

    const formData = new FormData();
    formData.append('config_file', files.config);
    formData.append('cell_layout', files.cell_layout);
    if (files.dye_layout) formData.append('dye_layout', files.dye_layout);
    if (files.meta_dye) formData.append('meta_dye', files.meta_dye);

    onFilesSelected(formData);
  };

  return (
    <div className="csv-uploader">
      <div className="csv-uploader-hero">
        <div>
          <h2 className="csv-title">Upload Files</h2>
          <p className="csv-subtitle">
            Upload the required files below, then run the import. Selected files stay here until you remove them.
          </p>
        </div>
      </div>

      <div className="csv-topline">
        <div className="csv-topline-count">
          {uploadedCount} file{uploadedCount === 1 ? '' : 's'} selected
        </div>
        <div className="csv-readiness-panel">
          <span className="csv-readiness-label">Status:</span>
          <div className={`csv-readiness-box ${requiredReady ? 'ready' : 'missing'}`}>
            {requiredReady ? 'Ready' : 'Missing required files'}
          </div>
        </div>
      </div>

      {message && <div className="csv-inline-message">{message}</div>}

      <div className="file-upload-grid">
        {FILE_SPECS.map((spec) => {
          const isUploaded = files[spec.key] != null;
          const file = files[spec.key];

          return (
            <div key={spec.key} className="file-upload-section">
              <div className="file-header">
                <div className="file-header-copy">
                  <h4>{spec.name}</h4>
                  <div className="file-badge-row">
                    <span className={`file-badge ${isUploaded ? 'uploaded' : spec.required ? 'required' : 'optional'}`}>
                      {spec.required ? 'Required' : 'Optional'}
                    </span>
                    <span className="file-badge type">{spec.type.toUpperCase()}</span>
                  </div>
                  <p>
                    {spec.description}
                  </p>
                  <div className="file-hint-row">
                    <span className="file-hint">{spec.hint}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadTemplate(spec.key)}
                  disabled={isLoading}
                  className="template-download-btn"
                  title={`Download ${spec.name} template`}
                >
                  Template
                </button>
              </div>

              {!isUploaded ? (
                <div
                  className={`drop-zone-compact ${dragOverKey === spec.key ? 'active' : ''}`}
                  onDragEnter={(e) => handleDragEnter(e, spec.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, spec.key)}
                >
                  <input
                    type="file"
                    onChange={(e) => handleFileInput(e, spec.key)}
                    disabled={isLoading}
                    style={{ display: 'none' }}
                    id={`file-input-${spec.key}`}
                    accept={spec.type === 'json' ? '.json' : '.csv'}
                  />
                  <label htmlFor={`file-input-${spec.key}`} className="drop-zone-label">
                    <div className="drop-zone-icon">
                      {spec.type === 'json' ? '▣' : '◫'}
                    </div>
                    <div className="drop-zone-title">Select one file or drop it here</div>
                    <div className="drop-zone-subtitle">One file per slot.</div>
                  </label>
                </div>
              ) : (
                <div className="uploaded-file-card">
                  <div className="uploaded-file-meta">
                    <span className="uploaded-file-check">✓</span>
                    <div className="uploaded-file-copy">
                      <div className="uploaded-file-name">{file?.name}</div>
                      <div className="uploaded-file-size">
                        {(file?.size ? (file.size / 1024).toFixed(1) : '0')} KB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClear(spec.key as UploadFileKey)}
                    disabled={isLoading}
                    className="file-remove-btn"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="csv-guidance-panel">
        <div className="csv-guidance-title">Notes</div>
        <ul>
          <li>Configuration and cell layout are required.</li>
          <li>Cell layout must be a matrix with row_name and numbered columns.</li>
          <li>Dye files are optional unless the run includes dye programs.</li>
        </ul>
      </div>

      <div className="csv-actions">
        <button
          onClick={handleClearAll}
          disabled={isLoading || uploadedCount === 0}
          className="clear-files-btn"
        >
          Clear all files
        </button>
        <button
          onClick={handleSubmit}
          disabled={!requiredReady || isLoading}
          className="submit-button"
        >
          {isLoading ? 'Processing...' : 'Import and run'}
        </button>
      </div>
    </div>
  );
};
