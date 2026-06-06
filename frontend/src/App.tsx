import React, { useState, useEffect } from 'react';
import { DesignPage } from './pages/design/DesignPage';
import { ResultsPage } from './pages/results/ResultsPage';
import { CSVUploader } from './components/CSVUploader';
import { usePlateStore } from './store/plateStore';
import { runCalculation, uploadCSVFiles, ConfigInput, PlateLayoutInput, DyeProgramInput, CalculationResult, healthCheck } from './services/apiClient';
import { IMPORT_SESSION_KEYS, prepareImportSessionData } from './utils/importUtils';
import './styles/App.css';

type PageType = 'home' | 'design' | 'designer' | 'results';
type ResultSource = 'design' | 'designer' | null;
type UploadFileKey = 'config' | 'cell_layout' | 'dye_layout' | 'meta_dye';
type UploadFilesState = Record<UploadFileKey, File | null>;

const EMPTY_UPLOAD_FILES: UploadFilesState = {
  config: null,
  cell_layout: null,
  dye_layout: null,
  meta_dye: null,
};
const API_UNAVAILABLE_MESSAGE =
  'Backend API is not available. Start iCELL with: bash scripts/start.sh';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [config, setConfig] = useState<ConfigInput | null>(null);
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [resultSource, setResultSource] = useState<ResultSource>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFilesState>(EMPTY_UPLOAD_FILES);
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if API is available on mount
  useEffect(() => {
    const checkAPI = async () => {
      const available = await healthCheck();
      setApiAvailable(available);
      if (!available) {
        setError(API_UNAVAILABLE_MESSAGE);
      }
    };

    checkAPI();
  }, []);

  const handleProcess = async (receivedConfig: ConfigInput, metaDyePrograms?: DyeProgramInput[]) => {
    setIsLoading(true);
    setError(null);

    IMPORT_SESSION_KEYS.forEach(key => sessionStorage.removeItem(key));

    try {
      const { wells, groups, dyePrograms: wellDyePrograms } = usePlateStore.getState();

      if (Object.keys(wells).length === 0) {
        setError('Please assign at least one well to a group on the Design page.');
        setIsLoading(false);
        return;
      }

      // Convert group name → seeding density
      const numericWells: Record<string, number> = {};
      Object.entries(wells).forEach(([well, groupName]) => {
        numericWells[well] = groups[groupName]?.density || 500;
      });

      // Validate dye programs in dye mode
      if (receivedConfig.mode === 'dye') {
        if (!metaDyePrograms || metaDyePrograms.length === 0) {
          setError('Dye mode requires at least one dye program to be defined on the Design page (Dye Programs).');
          setIsLoading(false);
          return;
        }

        const definedNames = new Set(metaDyePrograms.map(p => p.name));
        const assignedNames = new Set(Object.values(wellDyePrograms).filter(Boolean));
        const undefinedPrograms = [...assignedNames].filter(n => !definedNames.has(n));
        if (undefinedPrograms.length > 0) {
          setError(`Programs assigned to wells but not defined: ${undefinedPrograms.join(', ')}. Please define them on the Design page (Dye Programs).`);
          setIsLoading(false);
          return;
        }
      }

      const usedGroupNames = new Set(Object.values(wells));
      const groupDefinitions: Record<string, { cell_line: string; modification: string; passage: string; viability_percent: number }> = {};
      Object.values(groups).forEach((g) => {
        if (!usedGroupNames.has(g.name)) return;
        groupDefinitions[g.name] = {
          cell_line: g.cellLine ?? '',
          modification: g.modification ?? '',
          passage: g.passage ?? '',
          viability_percent: g.viability ?? 0,
        };
      });

      const plateLayout: PlateLayoutInput = {
        well_positions: numericWells,
        well_groups: wells,
        dye_programs: receivedConfig.mode === 'dye' ? wellDyePrograms : undefined,
        meta_dye_programs: receivedConfig.mode === 'dye' ? metaDyePrograms : undefined,
        group_definitions: Object.keys(groupDefinitions).length ? groupDefinitions : undefined,
      };

      console.log('📤 Sending to backend:', { config: receivedConfig, plateLayout });

      const result = await runCalculation(receivedConfig, plateLayout);

      if (result.status === 'error') {
        setError(result.error || 'Unknown error occurred');
      } else {
        setConfig(receivedConfig);
        setResults(result);
        setResultSource('design');
        setCurrentPage('results');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      console.error('❌ Error:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const importSession = await prepareImportSessionData(formData);
      const result = await uploadCSVFiles(formData);

      if (result.status === 'error') {
        setError(result.error || 'Upload failed');
      } else {
        setConfig(importSession.config);
        sessionStorage.setItem('lastProcessedWells', JSON.stringify(importSession.wells));
        sessionStorage.setItem('lastProcessedGroups', JSON.stringify(importSession.groups));
        sessionStorage.setItem('lastProcessedDyeAssignments', JSON.stringify(importSession.dyePrograms));
        sessionStorage.setItem('lastUploadedConfigFile', importSession.files.config);
        sessionStorage.setItem('lastUploadedCellLayoutFile', importSession.files.cellLayout);
        if (importSession.files.dyeLayout) {
          sessionStorage.setItem('lastUploadedDyeLayoutFile', importSession.files.dyeLayout);
        } else {
          sessionStorage.removeItem('lastUploadedDyeLayoutFile');
        }
        if (importSession.files.metaDye) {
          sessionStorage.setItem('lastUploadedMetaDyeFile', importSession.files.metaDye);
        } else {
          sessionStorage.removeItem('lastUploadedMetaDyeFile');
        }
        setResults(result);
        setResultSource('designer');
        setCurrentPage('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setConfig(null);
    setResults(null);
    setResultSource(null);
    setError(null);
  };

  const handleBackFromResults = () => {
    setCurrentPage(resultSource === 'designer' ? 'designer' : 'design');
    setError(null);
  };

  if (!apiAvailable && currentPage !== 'home') {
    return (
      <div className="app">
        <div className="error-banner">
          ⚠️ {API_UNAVAILABLE_MESSAGE}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>iCELL</h1>
        <p>Cell Seeding & Dye Preparation</p>
      </header>

      {error && (
        <div className="error-banner">
          ❌ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <main className="app-content">
        {currentPage === 'home' && (
          <div className="home-page">
            <div className="mode-selector">
              <button
                className="mode-button"
                onClick={() => setCurrentPage('design')}
              >
                <h3>New Project</h3>
                <p>Design plate layout, assign groups and dye programs, then configure seeding parameters.</p>
              </button>

              <button
                className="mode-button"
                onClick={() => setCurrentPage('designer')}
              >
                <h3>Import Files</h3>
                <p>Upload existing plate layouts for processing.</p>
              </button>
            </div>
          </div>
        )}

        {/* DesignPage: always mounted once visited so local state is preserved */}
        {(currentPage === 'design' || currentPage === 'results') && (
          <div style={{ display: currentPage === 'design' ? 'contents' : 'none' }}>
            <button onClick={handleBackToHome} className="breadcrumb-btn">
              ← Home
            </button>
            <DesignPage
              onProcess={handleProcess}
              onViewResults={results ? () => setCurrentPage('results') : undefined}
              isLoading={isLoading}
              isActive={currentPage === 'design'}
            />
          </div>
        )}

        {(currentPage === 'designer' || (currentPage === 'results' && resultSource === 'designer')) && (
          <div style={{ display: currentPage === 'designer' ? 'contents' : 'none' }}>
            <button onClick={handleBackToHome} className="breadcrumb-btn">
              ← Home
            </button>
            <div className="csv-container">
              <CSVUploader
                files={uploadFiles}
                onFilesChange={setUploadFiles}
                onFilesSelected={handleCSVUpload}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {currentPage === 'results' && results && (
          <ResultsPage
            instructions={results.instructions}
            seedingSummary={results.seeding_summary}
            dyeSummary={results.dye_summary}
            formattedSeedingSummary={results.formatted_seeding_summary}
            formattedDyeSummary={results.formatted_dye_summary}
            imetaRows={results.imeta_rows}
            plateType={config?.plate_type?.replace('_well', '')}
            numPlates={config?.num_plates ?? 1}
            mode={config?.mode}
            configData={config}
            onBackClick={handleBackFromResults}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>iCELL v1.0.0 | © 2026</p>
      </footer>
    </div>
  );
};

export default App;
