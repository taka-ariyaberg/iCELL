import { useState } from 'react';
import { buildDownloadFilename } from '../../utils/downloadFilenames';
import {
  downloadFile,
  generateCellLayout,
  generateDyeLayout,
  generateDyePNG,
  generateDyeSVG,
  generateLayoutPNG,
  generateLayoutSVG,
} from '../../utils/exportUtils';

interface GroupDef {
  density: number;
}

interface UseDownloadHandlersInput {
  effectivePlateType: string;
  projectName: string;
  plateId: string;
  wells: Record<string, string>;
  groups: Record<string, GroupDef>;
  dyePrograms: Record<string, string>;
}

/** Returns the six file-download handlers used by the Design page,
 *  plus the PNG-generation indicator string (`'layout'`, `'dye'`,
 *  or `null`). Centralizes the closure over the export pipeline so
 *  `DesignPage.tsx` doesn't carry six similar functions inline.
 */
export function useDownloadHandlers({
  effectivePlateType,
  projectName,
  plateId,
  wells,
  groups,
  dyePrograms,
}: UseDownloadHandlersInput) {
  const [downloadingPNG, setDownloadingPNG] = useState<string | null>(null);

  const handleDownloadLayoutCSV = () => downloadFile(
    generateCellLayout({ plateType: effectivePlateType, wells, groups }),
    buildDownloadFilename('cell_layout', 'csv', projectName, plateId),
    'text/csv',
  );
  const handleDownloadLayoutSVG = () => downloadFile(
    generateLayoutSVG({ plateType: effectivePlateType, wells, groups }),
    buildDownloadFilename('plate_layout', 'svg', projectName, plateId),
    'image/svg+xml',
  );
  const handleDownloadDyeCSV = () => downloadFile(
    generateDyeLayout({ plateType: effectivePlateType, wells, dyePrograms }),
    buildDownloadFilename('dye_layout', 'csv', projectName, plateId),
    'text/csv',
  );
  const handleDownloadDyeSVG = () => downloadFile(
    generateDyeSVG({ plateType: effectivePlateType, wells, groups, dyePrograms }),
    buildDownloadFilename('dye_assignment', 'svg', projectName, plateId),
    'image/svg+xml',
  );

  const handleDownloadLayoutPNG = async () => {
    setDownloadingPNG('layout');
    try {
      await generateLayoutPNG(
        { plateType: effectivePlateType, wells, groups },
        buildDownloadFilename('plate_layout', 'png', projectName, plateId),
      );
    } catch {
      alert('Failed to generate PNG.');
    } finally {
      setDownloadingPNG(null);
    }
  };
  const handleDownloadDyePNG = async () => {
    setDownloadingPNG('dye');
    try {
      await generateDyePNG(
        { plateType: effectivePlateType, wells, groups, dyePrograms },
        buildDownloadFilename('dye_assignment', 'png', projectName, plateId),
      );
    } catch {
      alert('Failed to generate PNG.');
    } finally {
      setDownloadingPNG(null);
    }
  };

  return {
    downloadingPNG,
    handleDownloadLayoutCSV,
    handleDownloadLayoutSVG,
    handleDownloadLayoutPNG,
    handleDownloadDyeCSV,
    handleDownloadDyeSVG,
    handleDownloadDyePNG,
  };
}