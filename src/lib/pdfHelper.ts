import * as pdfjs from 'pdfjs-dist';

// Set up the worker (using a CDN for the worker script is usually easiest in Vite/React)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const extractFirstPageAsImage = async (pdfUrl: string): Promise<string | null> => {
  try {
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    // Prepare canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render page into canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;

    // Return as data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error extracting PDF page:', error);
    return null;
  }
};
