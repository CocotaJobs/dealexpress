import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import PizZip from 'https://esm.sh/pizzip@3.1.7';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.4';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePdfRequest {
  proposalId: string;
}

interface ProposalItem {
  item_name: string;
  quantity: number;
  item_price: number;
  discount: number;
  subtotal: number;
  item_description?: string; // From items table
}

interface ProposalData {
  proposal: {
    proposal_number: string;
    client_name: string;
    client_email?: string;
    client_whatsapp?: string;
    client_company?: string;
    client_address?: string;
    client_cnpj?: string;
    payment_conditions?: string;
    validity_days: number;
    created_at: string;
    expires_at?: string;
  };
  items: ProposalItem[];
  vendor?: { name: string; email: string } | null;
  organization?: { name: string } | null;
  totalValue: number;
}

// Format currency helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Format date helper with Brasília timezone
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
};

// Format date extended (e.g., "29 de Janeiro de 2026") with Brasília timezone
const formatDateExtended = (): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo' };
  
  const day = new Intl.DateTimeFormat('pt-BR', { ...options, day: 'numeric' }).format(now);
  const monthIndex = parseInt(new Intl.DateTimeFormat('pt-BR', { ...options, month: 'numeric' }).format(now)) - 1;
  const year = new Intl.DateTimeFormat('pt-BR', { ...options, year: 'numeric' }).format(now);
  
  return `${day} de ${months[monthIndex]} de ${year}`;
};

// Generate items table as formatted text for template
function generateItemsTable(items: ProposalItem[], totalValue: number): string {
  let table = '';

  items.forEach((item, index) => {
    table += `${index + 1}. ${item.item_name}\n`;
    table += `   Qtd: ${item.quantity} x ${formatCurrency(Number(item.item_price))}`;
    if (Number(item.discount) > 0) {
      table += ` (-${Number(item.discount)}%)`;
    }
    table += ` = ${formatCurrency(Number(item.subtotal))}\n\n`;
  });

  table += `TOTAL: ${formatCurrency(totalValue)}`;

  return table;
}

/**
 * Sanitize XML string to remove invalid characters and fix entities.
 */
function sanitizeXmlString(input: string): { value: string; changed: boolean } {
  let value = input;
  let changed = false;

  // Remove invalid XML 1.0 chars (keep tab, LF, CR)
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (cleaned !== value) {
    value = cleaned;
    changed = true;
  }

  // Fix bare ampersands that aren't entities
  const fixedAmp = value.replace(
    /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g,
    '&amp;'
  );
  if (fixedAmp !== value) {
    value = fixedAmp;
    changed = true;
  }

  return { value, changed };
}

function isWellFormedXml(xml: string): boolean {
  try {
    const DP = (globalThis as unknown as { DOMParser?: unknown }).DOMParser as
      | (new () => { parseFromString: (s: string, type: string) => { getElementsByTagName: (t: string) => { length: number } } })
      | undefined;

    // If DOMParser isn't available in this runtime, we can't validate here.
    // In that case, just assume it's ok and let docxtemplater throw if needed.
    if (!DP) return true;

    const doc = new DP().parseFromString(xml, 'application/xml');
    return doc.getElementsByTagName('parsererror').length === 0;
  } catch {
    return false;
  }
}

/**
 * Merge all text runs within paragraphs that contain template delimiters.
 * This consolidates fragmented tags like:
 * <w:r><w:t>{</w:t></w:r><w:r><w:t>data</w:t></w:r><w:r><w:t>}</w:t></w:r>
 * Into a single run: <w:r><w:t xml:space="preserve">{data}</w:t></w:r>
 * 
 * This approach is more robust than trying to fix individual tags because:
 * 1. It handles any level of fragmentation
 * 2. It preserves paragraph properties
 * 3. It works with single-character delimiters (less prone to Word fragmentation)
 */
function mergeRunsInParagraph(xmlContent: string): string {
  console.log('Starting mergeRunsInParagraph preprocessing...');
  
  let fixedCount = 0;
  
  // Process each paragraph individually
  const result = xmlContent.replace(
    /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,
    (paragraph) => {
      // Quick check: if no braces at all, skip this paragraph
      if (!paragraph.includes('{') && !paragraph.includes('}')) {
        return paragraph;
      }
      
      // Replace <w:tab/> with a tab character wrapped in <w:t> so it's captured by the regex
      // This preserves tabs that Word stores as separate XML elements
      const processedParagraph = paragraph.replace(/<w:tab\s*\/?>/g, '<w:t>\t</w:t>');
      
      // Extract all text from <w:t> elements (now includes converted tabs)
      const textMatches = [...processedParagraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
      if (textMatches.length <= 1) {
        return paragraph; // Already consolidated or only one text node
      }
      
      // Combine all text content
      const fullText = textMatches.map(m => m[1]).join('');
      
      // If the combined text doesn't contain template delimiters, no need to modify
      if (!fullText.includes('{') && !fullText.includes('}')) {
        return paragraph;
      }
      
      console.log(`Merging paragraph with template text: "${fullText.substring(0, 60)}..."`);
      fixedCount++;
      
      // Preserve paragraph properties if they exist
      const pPrMatch = paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
      const pPr = pPrMatch ? pPrMatch[0] : '';
      
      // Extract paragraph opening tag (may have attributes)
      const pOpenMatch = paragraph.match(/^<w:p\b[^>]*>/);
      const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';
      
      // Extract run properties (formatting like bold, italic, font) from the first run that has them
      // This preserves formatting when consolidating fragmented runs
      const rPrMatch = paragraph.match(/<w:r[^>]*>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>[\s\S]*?<w:t/);
      const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';
      
      // Reconstruct the paragraph with a single run containing all text and preserved formatting
      return `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${fullText}</w:t></w:r></w:p>`;
    }
  );
  
  console.log(`Merged ${fixedCount} paragraphs with template delimiters`);
  return result;
}

// Process .docx template with dynamic field substitution
async function processDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: ProposalData
): Promise<Uint8Array> {
  const { proposal, items, vendor, organization, totalValue } = data;

  // Create items table text (fallback for {{tabela_itens}})
  const itemsTable = generateItemsTable(items, totalValue);

  // Create items array for loop syntax {#itens}...{/itens}
  const itensArray = items.map((item, index) => ({
    nome: item.item_name || '',
    descricao: item.item_description || '',
    valor: formatCurrency(Number(item.subtotal)),
    quantidade: String(item.quantity),
    valor_unitario: formatCurrency(Number(item.item_price)),
    desconto: Number(item.discount) > 0 ? `${Number(item.discount)}%` : '',
    indice: String(index + 1),
  }));

  // Map all dynamic fields
  // deno-lint-ignore no-explicit-any
  const templateData: Record<string, any> = {
    cliente_nome: proposal.client_name || '',
    cliente_email: proposal.client_email || '',
    cliente_whatsapp: proposal.client_whatsapp || '',
    cliente_empresa: proposal.client_company || '',
    cliente_endereco: proposal.client_address || '',
    cliente_cnpj: proposal.client_cnpj || '',
    data: formatDate(proposal.created_at),
    data_extenso: formatDateExtended(),
    numero_proposta: proposal.proposal_number || '',
    vendedor_nome: vendor?.name || '',
    vendedor_email: vendor?.email || '',
    empresa_nome: organization?.name || '',
    tabela_itens: itemsTable,
    valor_total: formatCurrency(totalValue),
    condicoes_pagamento: proposal.payment_conditions || '',
    validade_proposta: proposal.expires_at ? formatDate(proposal.expires_at) : '',
    validade_dias: String(proposal.validity_days),
    // Loop array for dynamic items
    itens: itensArray,
  };

  // Sanitize all fields to prevent "undefined" in output
  Object.keys(templateData).forEach(key => {
    if (templateData[key] === undefined || templateData[key] === null) {
      templateData[key] = '';
    }
  });

  console.log('Processing template with data keys:', Object.keys(templateData));
  console.log('Items array for loop:', JSON.stringify(itensArray, null, 2));

  try {
    // Load the docx as a zip
    const zip = new PizZip(templateBuffer);

    // Validate/repair XML files BEFORE touching docxtemplater.
    // Malformed XML can come from the source .docx itself (not only template tags).
    const xmlFilesToCheck = [
      'word/document.xml',
      ...Object.keys(zip.files).filter(name => name.match(/word\/header\d*\.xml/)),
      ...Object.keys(zip.files).filter(name => name.match(/word\/footer\d*\.xml/)),
    ];

    const malformedXmlFiles: string[] = [];

    for (const fileName of xmlFilesToCheck) {
      const file = zip.file(fileName);
      if (!file) continue;

      const original = file.asText();
      if (isWellFormedXml(original)) continue;

      const { value: sanitized, changed } = sanitizeXmlString(original);
      if (changed && isWellFormedXml(sanitized)) {
        zip.file(fileName, sanitized);
        console.log(`Repaired malformed XML in ${fileName} (sanitized characters/entities)`);
      } else {
        malformedXmlFiles.push(fileName);
      }
    }

    if (malformedXmlFiles.length > 0) {
      // Fail early with actionable detail (Docxtemplater error doesn't say which XML file is broken)
      throw new Error(
        `Template .docx contém XML malformado em: ${malformedXmlFiles.join(', ')}. ` +
          `Dica: Abra o template no Word e use "Salvar como" (novo .docx) ou copie o conteúdo para um documento novo e salve novamente.`
      );
    }
    
    // Merge runs in paragraphs that contain template delimiters
    for (const fileName of xmlFilesToCheck) {
      const file = zip.file(fileName);
      if (!file) continue;
      const content = file.asText();
      const merged = mergeRunsInParagraph(content);
      if (merged !== content) {
        zip.file(fileName, merged);
        console.log(`Runs merged in ${fileName}`);
      }
    }
    
    // Create docxtemplater instance with single-character delimiters
    // Single braces are much less likely to be fragmented by Word
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });

    // Render the document with data
    doc.render(templateData);

    // Get the processed document as Uint8Array
    const processedBuffer = doc.getZip().generate({
      type: 'uint8array',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    console.log('Template processed successfully, size:', processedBuffer.length, 'bytes');
    return processedBuffer;
  } catch (error) {
    console.error('Error processing docx template:', error);
    throw error;
  }
}

// Convert DOCX to PDF using PDF.co API
async function convertDocxToPdfWithPdfCo(docxBuffer: Uint8Array, fileName: string): Promise<Uint8Array> {
  const PDFCO_API_KEY = Deno.env.get('PDFCO_API_KEY');
  
  if (!PDFCO_API_KEY) {
    console.error('PDFCO_API_KEY is not configured');
    throw new Error('Serviço de conversão PDF indisponível');
  }

  console.log('Converting DOCX to PDF via PDF.co...');

  // Step 1: Upload the DOCX file as base64
  const base64Content = base64Encode(docxBuffer);
  
  console.log('Uploading DOCX to PDF.co, base64 size:', base64Content.length);

  const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
    method: 'POST',
    headers: {
      'x-api-key': PDFCO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: base64Content,
      name: fileName,
    }),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('PDF.co upload failed:', uploadResponse.status, errorText);
    throw new Error('Falha ao processar arquivo para conversão');
  }

  const uploadData = await uploadResponse.json();
  
  if (uploadData.error) {
    console.error('PDF.co upload error:', uploadData.message);
    throw new Error('Falha ao processar arquivo para conversão');
  }

  const uploadedFileUrl = uploadData.url;
  console.log('DOCX uploaded to PDF.co successfully');

  // Step 2: Convert DOCX to PDF
  const convertResponse = await fetch('https://api.pdf.co/v1/pdf/convert/from/doc', {
    method: 'POST',
    headers: {
      'x-api-key': PDFCO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: uploadedFileUrl,
      name: fileName.replace('.docx', '.pdf'),
      async: false, // Wait for result
    }),
  });

  if (!convertResponse.ok) {
    const errorText = await convertResponse.text();
    console.error('PDF.co conversion failed:', convertResponse.status, errorText);
    throw new Error('Falha ao converter documento para PDF');
  }

  const convertData = await convertResponse.json();
  
  if (convertData.error) {
    console.error('PDF.co conversion error:', convertData.message);
    throw new Error('Falha ao converter documento para PDF');
  }

  console.log('DOCX converted to PDF successfully via PDF.co');

  // Step 3: Download the resulting PDF
  const pdfResponse = await fetch(convertData.url);
  
  if (!pdfResponse.ok) {
    console.error('Failed to download converted PDF:', pdfResponse.status);
    throw new Error('Falha ao baixar PDF convertido');
  }

  const pdfArrayBuffer = await pdfResponse.arrayBuffer();
  console.log('PDF downloaded from PDF.co, size:', pdfArrayBuffer.byteLength, 'bytes');
  
  return new Uint8Array(pdfArrayBuffer);
}

// Generate default PDF using pdf-lib (fallback when no template)
async function generateDefaultPdf(data: ProposalData): Promise<Uint8Array> {
  const { proposal, items, vendor, organization, totalValue } = data;

  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions in points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  const primaryColor = rgb(0.231, 0.510, 0.965);
  const textColor = rgb(0.122, 0.161, 0.216);
  const mutedColor = rgb(0.420, 0.451, 0.490);

  const checkPageBreak = (neededHeight: number) => {
    if (yPosition - neededHeight < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };

  const drawText = (text: string, x: number, y: number, options: { font?: typeof helveticaFont; size?: number; color?: typeof textColor } = {}) => {
    const font = options.font || helveticaFont;
    const size = options.size || 10;
    const color = options.color || textColor;
    // Sanitize text for WinAnsi encoding
    const sanitized = text
      .replace(/\t/g, '    ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '');
    try {
      page.drawText(sanitized, { x, y, size, font, color });
    } catch {
      // If still fails, use ASCII only
      page.drawText(sanitized.replace(/[^\x20-\x7E]/g, '?'), { x, y, size, font, color });
    }
  };

  // Header
  drawText(organization?.name || 'Proposta Comercial', margin, yPosition, {
    font: helveticaBold,
    size: 22,
    color: primaryColor,
  });
  yPosition -= 25;

  drawText('Proposta Comercial', margin, yPosition, { size: 12, color: mutedColor });
  
  const proposalNumber = proposal.proposal_number;
  const numberWidth = helveticaBold.widthOfTextAtSize(proposalNumber, 14);
  drawText(proposalNumber, pageWidth - margin - numberWidth, yPosition + 10, {
    font: helveticaBold,
    size: 14,
  });
  
  const dateText = `Emitida em: ${formatDate(proposal.created_at)}`;
  const dateWidth = helveticaFont.widthOfTextAtSize(dateText, 10);
  drawText(dateText, pageWidth - margin - dateWidth, yPosition - 5, {
    size: 10,
    color: mutedColor,
  });
  yPosition -= 20;

  // Blue line
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: contentWidth,
    height: 3,
    color: primaryColor,
  });
  yPosition -= 30;

  // Client Data
  drawText('DADOS DO CLIENTE', margin, yPosition, {
    font: helveticaBold,
    size: 12,
    color: primaryColor,
  });
  yPosition -= 20;

  const clientFields = [
    { label: 'Nome:', value: proposal.client_name },
    { label: 'Empresa:', value: proposal.client_company },
    { label: 'Email:', value: proposal.client_email },
    { label: 'WhatsApp:', value: proposal.client_whatsapp },
    { label: 'Endereco:', value: proposal.client_address },
  ].filter(f => f.value);

  for (const field of clientFields) {
    checkPageBreak(20);
    drawText(field.label, margin, yPosition, { font: helveticaBold, size: 10 });
    drawText(field.value!, margin + 70, yPosition, { size: 10 });
    yPosition -= 16;
  }
  yPosition -= 15;

  // Items Table
  checkPageBreak(100);
  drawText('ITENS DA PROPOSTA', margin, yPosition, {
    font: helveticaBold,
    size: 12,
    color: primaryColor,
  });
  yPosition -= 25;

  page.drawRectangle({
    x: margin,
    y: yPosition - 5,
    width: contentWidth,
    height: 20,
    color: rgb(0.95, 0.96, 0.97),
  });

  const colWidths = [220, 50, 90, 50, 90];
  let xPos = margin + 5;

  const headers = ['Descricao', 'Qtd', 'Valor Unit.', 'Desc.', 'Subtotal'];
  headers.forEach((header, i) => {
    drawText(header, xPos, yPosition, { font: helveticaBold, size: 9 });
    xPos += colWidths[i];
  });
  yPosition -= 25;

  for (const item of items) {
    checkPageBreak(25);
    xPos = margin + 5;
    
    let itemName = item.item_name;
    const maxNameWidth = colWidths[0] - 10;
    while (helveticaFont.widthOfTextAtSize(itemName, 9) > maxNameWidth && itemName.length > 3) {
      itemName = itemName.slice(0, -4) + '...';
    }
    
    drawText(itemName, xPos, yPosition, { size: 9 });
    xPos += colWidths[0];
    
    drawText(String(item.quantity), xPos, yPosition, { size: 9 });
    xPos += colWidths[1];
    
    drawText(formatCurrency(Number(item.item_price)), xPos, yPosition, { size: 9 });
    xPos += colWidths[2];
    
    drawText(`${Number(item.discount).toFixed(0)}%`, xPos, yPosition, { size: 9 });
    xPos += colWidths[3];
    
    drawText(formatCurrency(Number(item.subtotal)), xPos, yPosition, { font: helveticaBold, size: 9 });

    yPosition -= 5;
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: margin + contentWidth, y: yPosition },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    yPosition -= 15;
  }

  // Total row
  checkPageBreak(30);
  page.drawRectangle({
    x: margin,
    y: yPosition - 5,
    width: contentWidth,
    height: 25,
    color: primaryColor,
  });

  const totalLabel = 'VALOR TOTAL:';
  const totalValue$ = formatCurrency(totalValue);
  
  drawText(totalLabel, margin + colWidths[0] + colWidths[1] + colWidths[2], yPosition + 3, {
    font: helveticaBold,
    size: 11,
    color: rgb(1, 1, 1),
  });
  
  const totalValueWidth = helveticaBold.widthOfTextAtSize(totalValue$, 12);
  drawText(totalValue$, margin + contentWidth - totalValueWidth - 10, yPosition + 3, {
    font: helveticaBold,
    size: 12,
    color: rgb(1, 1, 1),
  });
  yPosition -= 40;

  // Payment Conditions
  if (proposal.payment_conditions) {
    checkPageBreak(60);
    
    drawText('CONDICOES DE PAGAMENTO', margin, yPosition, {
      font: helveticaBold,
      size: 12,
      color: primaryColor,
    });
    yPosition -= 20;
    
    const words = proposal.payment_conditions.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (helveticaFont.widthOfTextAtSize(testLine, 10) > contentWidth && currentLine) {
        checkPageBreak(14);
        drawText(currentLine, margin, yPosition, { size: 10 });
        yPosition -= 14;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      checkPageBreak(14);
      drawText(currentLine, margin, yPosition, { size: 10 });
      yPosition -= 14;
    }
    yPosition -= 10;
  }

  // Validity
  checkPageBreak(50);
  
  page.drawRectangle({
    x: margin,
    y: yPosition - 25,
    width: contentWidth,
    height: 35,
    color: rgb(1, 0.95, 0.78),
    borderColor: rgb(0.96, 0.62, 0.04),
    borderWidth: 1,
  });

  const validityText = `Validade: Esta proposta e valida por ${proposal.validity_days} dias${proposal.expires_at ? ` (ate ${formatDate(proposal.expires_at)})` : ''}`;
  const validityWidth = helveticaFont.widthOfTextAtSize(validityText, 10);
  drawText(validityText, margin + (contentWidth - validityWidth) / 2, yPosition - 12, {
    size: 10,
    color: rgb(0.573, 0.251, 0.055),
  });
  yPosition -= 50;

  // Signature area
  checkPageBreak(80);
  yPosition -= 30;

  const signatureWidth = (contentWidth - 40) / 2;
  
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: margin + signatureWidth, y: yPosition },
    thickness: 1,
    color: textColor,
  });
  const leftLabel = organization?.name || 'Fornecedor';
  const leftLabelWidth = helveticaFont.widthOfTextAtSize(leftLabel, 10);
  drawText(leftLabel, margin + (signatureWidth - leftLabelWidth) / 2, yPosition - 15, {
    size: 10,
    color: mutedColor,
  });

  page.drawLine({
    start: { x: margin + signatureWidth + 40, y: yPosition },
    end: { x: margin + contentWidth, y: yPosition },
    thickness: 1,
    color: textColor,
  });
  const rightLabel = proposal.client_name;
  const rightLabelWidth = helveticaFont.widthOfTextAtSize(rightLabel, 10);
  drawText(rightLabel, margin + signatureWidth + 40 + (signatureWidth - rightLabelWidth) / 2, yPosition - 15, {
    size: 10,
    color: mutedColor,
  });

  yPosition -= 40;

  // Footer
  if (vendor) {
    const vendorText = `Vendedor: ${vendor.name} | ${vendor.email}`;
    const vendorWidth = helveticaFont.widthOfTextAtSize(vendorText, 9);
    drawText(vendorText, margin + (contentWidth - vendorWidth) / 2, yPosition, {
      size: 9,
      color: mutedColor,
    });
    yPosition -= 15;
  }

  const footerText = 'Documento gerado automaticamente pelo ProposalFlow';
  const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 8);
  drawText(footerText, margin + (contentWidth - footerWidth) / 2, yPosition, {
    size: 8,
    color: mutedColor,
  });

  return pdfDoc.save();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Supabase credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // deno-lint-ignore no-explicit-any
  const supabaseAdmin: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const body: GeneratePdfRequest = await req.json();
    const { proposalId } = body;

    console.log(`Generating PDF for proposal: ${proposalId}, user: ${userId}`);

    // Fetch proposal data
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      console.error('Proposal not found:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch proposal items with item descriptions from items table
    const { data: proposalItemsRaw, error: itemsError } = await supabaseAdmin
      .from('proposal_items')
      .select('*, items:item_id(description)')
      .eq('proposal_id', proposalId);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    // Map items to include description from the joined items table
    const items = (proposalItemsRaw || []).map((pi: { items?: { description?: string } | null } & ProposalItem) => ({
      ...pi,
      item_description: pi.items?.description || '',
    }));

    // Fetch vendor
    const { data: vendor } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', proposal.created_by)
      .single();

    // Fetch organization
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', proposal.organization_id)
      .single();

    // Calculate totals
    const totalValue = (items || []).reduce((sum: number, item: ProposalItem) => sum + Number(item.subtotal), 0);

    // Prepare proposal data
    const proposalData: ProposalData = {
      proposal,
      items: items || [],
      vendor,
      organization,
      totalValue,
    };

    let pdfBuffer: Uint8Array;
    let docxBuffer: Uint8Array | null = null;
    let usedCustomTemplate = false;
    let docxUrl: string | null = null;

    // Try to fetch active template for organization
    console.log(`Looking for active template for organization: ${proposal.organization_id}`);
    const { data: template, error: templateError } = await supabaseAdmin
      .from('templates')
      .select('file_path, name')
      .eq('organization_id', proposal.organization_id)
      .eq('is_active', true)
      .single();

    if (template && !templateError) {
      console.log(`Found active template: ${template.name} at ${template.file_path}`);
      
      try {
        // Download the template file
        const { data: templateFile, error: downloadError } = await supabaseAdmin
          .storage
          .from('templates')
          .download(template.file_path);

        if (downloadError) {
          console.error('Error downloading template:', downloadError);
          throw downloadError;
        }

        console.log('Template downloaded successfully');

        // Convert Blob to ArrayBuffer
        const templateBuffer = await templateFile.arrayBuffer();

        // Process the template with dynamic fields
        docxBuffer = await processDocxTemplate(templateBuffer, proposalData);
        console.log('DOCX processed with dynamic fields');

        // Save the processed DOCX to storage
        const docxFileName = `${proposal.organization_id}/${proposal.proposal_number}.docx`;
        
        const { error: docxUploadError } = await supabaseAdmin
          .storage
          .from('generated-pdfs')
          .upload(docxFileName, docxBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            cacheControl: '0',
            upsert: true,
          });

        if (docxUploadError) {
          console.error('Error uploading processed DOCX:', docxUploadError);
        } else {
          // Use signed URL instead of public URL (1 hour expiry)
          const { data: docxUrlData, error: signedUrlError } = await supabaseAdmin
            .storage
            .from('generated-pdfs')
            .createSignedUrl(docxFileName, 3600);
          if (!signedUrlError && docxUrlData) {
            docxUrl = docxUrlData.signedUrl;
          }
          console.log('Processed DOCX saved to storage:', docxFileName);
        }

        // Convert DOCX to PDF using PDF.co
        pdfBuffer = await convertDocxToPdfWithPdfCo(docxBuffer, `${proposal.proposal_number}.docx`);
        usedCustomTemplate = true;

        console.log('PDF generated from custom template via PDF.co');
      } catch (templateProcessError) {
        console.error('Error processing custom template:', templateProcessError);
        
        // Extract useful error message for the user (without exposing internal details)
        let errorMessage = 'Erro ao processar template';
        let errorDetails = 'Verifique se o template está formatado corretamente.';
        
        // deno-lint-ignore no-explicit-any
        const tplError = templateProcessError as any;
        if (tplError?.properties?.errors) {
          const errors = tplError.properties.errors;
          const firstError = errors[0];
          if (firstError?.properties?.xtag) {
            // Sanitize tag name - only show first 20 chars max
            const tagName = String(firstError.properties.xtag).substring(0, 20);
            errorMessage = `Erro na tag do template`;
            errorDetails = `Verifique a tag "${tagName}". Dica: Abra o template Word, delete completamente a tag e digite-a novamente de uma só vez, sem pausas.`;
          }
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage, 
            details: errorDetails 
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.error('No active template found - template is required');
      return new Response(
        JSON.stringify({ 
          error: 'Template não encontrado', 
          details: 'É necessário ter um template ativo para gerar PDFs. Acesse a página de Templates e faça upload de um arquivo .docx.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save PDF to storage
    const pdfFileName = `${proposal.organization_id}/${proposal.proposal_number}.pdf`;
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('generated-pdfs')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '0',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Falha ao salvar PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URL (1 hour expiry) instead of public URL for security
    const { data: urlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('generated-pdfs')
      .createSignedUrl(pdfFileName, 3600);

    if (signedUrlError || !urlData) {
      console.error('Error creating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar URL do PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the file path (not URL) in database - we'll generate fresh signed URLs on demand
    const pdfPath = pdfFileName;
    await supabaseAdmin
      .from('proposals')
      .update({ pdf_url: pdfPath })
      .eq('id', proposalId);

    console.log(`PDF generated successfully: ${pdfFileName} (custom template: ${usedCustomTemplate})`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.signedUrl,
        docxUrl: docxUrl,
        fileName: `${proposal.proposal_number}.pdf`,
        usedCustomTemplate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
