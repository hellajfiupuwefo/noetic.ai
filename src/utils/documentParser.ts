import '../polyfills';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export interface ParseProgressCallback {
  (current: number, total: number, message: string): void;
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedarray = new Uint8Array(arrayBuffer);

    onProgress?.(0, 1, 'Initializing PDF parser...');

    const loadingTask = pdfjsLib.getDocument({
      data: typedarray,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    if (numPages === 0) {
      throw new Error('PDF has no pages.');
    }

    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(pageNum, numPages, `Extracting page ${pageNum} of ${numPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageStrings = textContent.items
        .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
        .filter(Boolean);

      const pageText = pageStrings.join(' ');
      if (pageText.trim()) {
        textPieces.push(`--- Page ${pageNum} ---\n${pageText}`);
      }
    }

    const fullText = textPieces.join('\n\n').trim();
    if (!fullText) {
      throw new Error('No selectable text found in PDF (it may contain scanned image pages).');
    }

    return fullText;
  } catch (clientErr: any) {
    console.warn('Client-side PDF extraction failed, trying server fallback:', clientErr);
    // Attempt server-side extraction
    return await extractViaServer(file, 'pdf');
  }
}

export async function extractTextFromDOCX(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<string> {
  try {
    onProgress?.(1, 2, 'Reading DOCX archive contents...');
    const arrayBuffer = await file.arrayBuffer();
    
    onProgress?.(2, 2, 'Extracting text with Mammoth...');
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();

    if (!text) {
      throw new Error('DOCX document appears to be empty or contains no text elements.');
    }

    return text;
  } catch (clientErr: any) {
    console.warn('Client-side DOCX extraction failed, trying server fallback:', clientErr);
    return await extractViaServer(file, 'docx');
  }
}

async function extractViaServer(file: File, fileType: 'pdf' | 'docx'): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Convert arrayBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const res = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileType,
      dataBase64: base64
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server extraction failed for ${file.name}`);
  }

  const data = await res.json();
  if (!data.text || typeof data.text !== 'string' || !data.text.trim()) {
    throw new Error(`No readable text could be extracted from ${file.name}.`);
  }

  return data.text.trim();
}

/**
 * Universal document loader that blocks naive file.text() for PDF & DOCX
 * and parses appropriately.
 */
export async function parseDocumentFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<{ text: string; format: string }> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  // Block naive text path for PDFs
  if (ext === 'pdf') {
    const text = await extractTextFromPDF(file, onProgress);
    return { text, format: 'PDF Document' };
  }

  // Block naive text path for DOCX
  if (ext === 'docx') {
    const text = await extractTextFromDOCX(file, onProgress);
    return { text, format: 'Word Document (.docx)' };
  }

  // Legacy .doc format alert
  if (ext === 'doc') {
    throw new Error('Legacy binary .doc files are not supported. Please save or convert the file to .docx or .pdf.');
  }

  // Common plain text formats
  if (['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'rtf', 'html', 'js', 'ts', 'py'].includes(ext) || file.type.startsWith('text/')) {
    onProgress?.(1, 1, `Reading ${file.name}...`);
    const text = await file.text();
    return { text, format: ext.toUpperCase() || 'Text' };
  }

  // Block unsupported media / binary
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp3', 'mp4', 'zip', 'tar', 'exe', 'bin'].includes(ext)) {
    throw new Error(`Cannot extract text from binary media file: ${file.name}`);
  }

  // Default fallback try text()
  onProgress?.(1, 1, `Reading ${file.name}...`);
  const text = await file.text();
  return { text, format: 'Text Document' };
}
