/**
 * Parses a file and returns its text content.
 * Supports PDF (via pdf.js), DOCX (via mammoth), and plain text formats.
 */
export const parseFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'pdf':
        return await parsePdf(file);
      case 'docx':
        return await parseDocx(file);
      case 'txt':
      case 'md':
      case 'json':
      case 'csv':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'js':
      case 'ts':
      case 'py':
      case 'html':
      case 'css':
        return await parseText(file);
      default:
        // Attempt to read as text for unknown extensions, might fail for binaries
        console.warn(`Unknown extension .${extension}, attempting to read as text.`);
        return await parseText(file);
    }
  } catch (err) {
    console.error(`Error parsing file ${file.name}:`, err);
    throw new Error(`Failed to parse ${file.name}`);
  }
};

const parseText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  // @ts-ignore
  if (!window.pdfjsLib) throw new Error("PDF.js library not loaded");
  
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  // Iterate over all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // @ts-ignore
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  
  return fullText;
};

const parseDocx = async (file: File): Promise<string> => {
  // @ts-ignore
  if (!window.mammoth) throw new Error("Mammoth library not loaded");
  
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  
  if (result.messages.length > 0) {
    console.log("Mammoth messages:", result.messages);
  }
  
  return result.value;
};