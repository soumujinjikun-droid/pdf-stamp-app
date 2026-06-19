/**
 * Dynamically loads PDF.JS client script and worker script from standard CDN.
 * This completely avoids local bundling issues of workers in modern Vite/React compilations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let pdfjsLoadPromise: Promise<any> | null = null;

export function loadPdfJS(): Promise<any> {
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    // Check if window.pdfjsLib is already loaded
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('PDF.js library loaded but pdfjsLib could not be found on window object.'));
      }
    };
    
    script.onerror = (err) => {
      pdfjsLoadPromise = null;
      reject(new Error('Failed to load PDF.js from CDN. Please check your network connection.'));
    };
    
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}
