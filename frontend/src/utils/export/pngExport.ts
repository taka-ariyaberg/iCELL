/** Render an SVG string into a PNG file and trigger a download.
 *
 * Uses a Canvas with the device pixel ratio so the result is sharp on
 * Retina displays. Browser-only — relies on `Image`, `Blob`, `Canvas`,
 * `URL.createObjectURL`, and DOM events.
 */

import { generateDyeSVG, generateLayoutSVG } from './svgExport';
import { PlateExportData } from './plateLayout';

async function svgToPng(svgString: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml');
    const svgElement = svg.documentElement;

    const width = parseInt(svgElement.getAttribute('width') || '800');
    const height = parseInt(svgElement.getAttribute('height') || '600');

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    ctx.scale(dpr, dpr);

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // No background fill — keep the canvas transparent (iPLAID-style) so the
      // PNG inherits the SVG's transparent outer area.
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(svgUrl);
          resolve();
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = svgUrl;
  });
}

export async function generateLayoutPNG(data: PlateExportData, filename: string): Promise<void> {
  const svg = generateLayoutSVG(data);
  await svgToPng(svg, filename);
}

export async function generateDyePNG(data: PlateExportData, filename: string): Promise<void> {
  const svg = generateDyeSVG(data);
  await svgToPng(svg, filename);
}