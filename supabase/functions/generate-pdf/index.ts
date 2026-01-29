import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as mammoth from 'https://esm.sh/mammoth@1.6.0';
import PizZip from 'https://esm.sh/pizzip@3.1.7';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.4';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

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
}

interface ProposalData {
  proposal: {
    proposal_number: string;
    client_name: string;
    client_email?: string;
    client_whatsapp?: string;
    client_company?: string;
    client_address?: string;
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

// Format date helper
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format date extended (e.g., "29 de Janeiro de 2026")
const formatDateExtended = (): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} de ${month} de ${year}`;
};

// Generate items table as formatted text
function generateItemsTable(items: ProposalItem[], totalValue: number): string {
  let table = 'ITENS DA PROPOSTA\n';
  table += '-'.repeat(40) + '\n\n';

  items.forEach((item, index) => {
    table += `${index + 1}. ${item.item_name}\n`;
    table += `   Qtd: ${item.quantity} x ${formatCurrency(Number(item.item_price))}`;
    if (Number(item.discount) > 0) {
      table += ` (-${Number(item.discount)}%)`;
    }
    table += ` = ${formatCurrency(Number(item.subtotal))}\n\n`;
  });

  table += '-'.repeat(40) + '\n';
  table += `TOTAL: ${formatCurrency(totalValue)}\n`;

  return table;
}

// Process .docx template with dynamic field substitution
async function processDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: ProposalData
): Promise<ArrayBuffer> {
  const { proposal, items, vendor, organization, totalValue } = data;

  // Create items table text
  const itemsTable = generateItemsTable(items, totalValue);

  // Map all dynamic fields
  const templateData = {
    cliente_nome: proposal.client_name || '',
    cliente_email: proposal.client_email || '',
    cliente_whatsapp: proposal.client_whatsapp || '',
    cliente_empresa: proposal.client_company || '',
    cliente_endereco: proposal.client_address || '',
    data: formatDate(proposal.created_at),
    numero_proposta: proposal.proposal_number || '',
    vendedor_nome: vendor?.name || '',
    vendedor_email: vendor?.email || '',
    empresa_nome: organization?.name || '',
    tabela_itens: itemsTable,
    valor_total: formatCurrency(totalValue),
    condicoes_pagamento: proposal.payment_conditions || '',
    validade_proposta: proposal.expires_at ? formatDate(proposal.expires_at) : '',
    validade_dias: String(proposal.validity_days),
  };

  console.log('Processing template with data:', Object.keys(templateData));

  try {
    // Load the docx as a zip
    const zip = new PizZip(templateBuffer);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    // Render the document with data
    doc.render(templateData);

    // Get the processed document as ArrayBuffer
    const processedBuffer = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    console.log('Template processed successfully');
    return processedBuffer;
  } catch (error) {
    console.error('Error processing docx template:', error);
    throw error;
  }
}

// Convert DOCX to HTML using mammoth with enhanced options
async function convertDocxToHtml(docxBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: docxBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "b => strong",
          "i => em",
          "u => u",
        ],
      }
    );
    
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth conversion messages:', result.messages);
    }

    console.log('DOCX converted to HTML successfully');
    return result.value;
  } catch (error) {
    console.error('Error converting docx to HTML:', error);
    throw error;
  }
}

// Parse HTML content for PDF generation
function parseHtmlContent(html: string): string[] {
  // Remove HTML tags but preserve structure
  const lines = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h1[^>]*>/gi, '\n### ')
    .replace(/<\/h1>/gi, ' ###\n')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<\/h2>/gi, ' ##\n')
    .replace(/<h3[^>]*>/gi, '\n# ')
    .replace(/<\/h3>/gi, ' #\n')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '')
    .replace(/<td[^>]*>/gi, '  ')
    .replace(/<\/td>/gi, '  |')
    .replace(/<th[^>]*>/gi, '  ')
    .replace(/<\/th>/gi, '  |')
    .replace(/<li[^>]*>/gi, '\n  • ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines;
}

// Generate high-quality PDF using pdf-lib
async function generatePdfWithPdfLib(data: ProposalData, htmlContent?: string): Promise<Uint8Array> {
  const { proposal, items, vendor, organization, totalValue } = data;

  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions in points (72 points per inch)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  const primaryColor = rgb(0.231, 0.510, 0.965); // #3b82f6
  const textColor = rgb(0.122, 0.161, 0.216); // #1f2937
  const mutedColor = rgb(0.420, 0.451, 0.490); // #6b7280

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition - neededHeight < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };

  // Helper to draw text
  const drawText = (text: string, x: number, y: number, options: { font?: typeof helveticaFont; size?: number; color?: typeof textColor } = {}) => {
    const font = options.font || helveticaFont;
    const size = options.size || 10;
    const color = options.color || textColor;
    page.drawText(text, { x, y, size, font, color });
  };

  // Helper to draw wrapped text
  const drawWrappedText = (text: string, maxWidth: number, fontSize: number, font: typeof helveticaFont): number => {
    const words = text.split(' ');
    let currentLine = '';
    let linesDrawn = 0;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > maxWidth && currentLine) {
        checkPageBreak(fontSize + 4);
        drawText(currentLine, margin, yPosition, { font, size: fontSize });
        yPosition -= fontSize + 4;
        currentLine = word;
        linesDrawn++;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      checkPageBreak(fontSize + 4);
      drawText(currentLine, margin, yPosition, { font, size: fontSize });
      yPosition -= fontSize + 4;
      linesDrawn++;
    }

    return linesDrawn;
  };

  // === HEADER ===
  // Company name
  drawText(organization?.name || 'Proposta Comercial', margin, yPosition, {
    font: helveticaBold,
    size: 22,
    color: primaryColor,
  });
  yPosition -= 25;

  // Proposal number and date
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

  // Blue line separator
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: contentWidth,
    height: 3,
    color: primaryColor,
  });
  yPosition -= 30;

  // === CLIENT DATA ===
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
    { label: 'Endereço:', value: proposal.client_address },
  ].filter(f => f.value);

  for (const field of clientFields) {
    checkPageBreak(20);
    drawText(field.label, margin, yPosition, { font: helveticaBold, size: 10 });
    drawText(field.value!, margin + 70, yPosition, { size: 10 });
    yPosition -= 16;
  }
  yPosition -= 15;

  // === ITEMS TABLE ===
  checkPageBreak(100);
  drawText('ITENS DA PROPOSTA', margin, yPosition, {
    font: helveticaBold,
    size: 12,
    color: primaryColor,
  });
  yPosition -= 25;

  // Table header
  page.drawRectangle({
    x: margin,
    y: yPosition - 5,
    width: contentWidth,
    height: 20,
    color: rgb(0.95, 0.96, 0.97),
  });

  const colWidths = [220, 50, 90, 50, 90]; // Description, Qty, Unit Price, Disc, Subtotal
  let xPos = margin + 5;

  const headers = ['Descrição', 'Qtd', 'Valor Unit.', 'Desc.', 'Subtotal'];
  headers.forEach((header, i) => {
    drawText(header, xPos, yPosition, { font: helveticaBold, size: 9 });
    xPos += colWidths[i];
  });
  yPosition -= 25;

  // Table rows
  for (const item of items) {
    checkPageBreak(25);

    xPos = margin + 5;
    
    // Truncate item name if too long
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

    // Draw light line
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

  // === PAYMENT CONDITIONS ===
  if (proposal.payment_conditions) {
    checkPageBreak(60);
    
    drawText('CONDIÇÕES DE PAGAMENTO', margin, yPosition, {
      font: helveticaBold,
      size: 12,
      color: primaryColor,
    });
    yPosition -= 20;
    
    drawWrappedText(proposal.payment_conditions, contentWidth, 10, helveticaFont);
    yPosition -= 10;
  }

  // === VALIDITY ===
  checkPageBreak(50);
  
  page.drawRectangle({
    x: margin,
    y: yPosition - 25,
    width: contentWidth,
    height: 35,
    color: rgb(1, 0.95, 0.78), // Light yellow
    borderColor: rgb(0.96, 0.62, 0.04), // Orange border
    borderWidth: 1,
  });

  const validityText = `Validade: Esta proposta e valida por ${proposal.validity_days} dias${proposal.expires_at ? ` (ate ${formatDate(proposal.expires_at)})` : ''}`;
  const validityWidth = helveticaFont.widthOfTextAtSize(validityText, 10);
  drawText(validityText, margin + (contentWidth - validityWidth) / 2, yPosition - 12, {
    size: 10,
    color: rgb(0.573, 0.251, 0.055),
  });
  yPosition -= 50;

  // === SIGNATURE AREA ===
  checkPageBreak(80);
  yPosition -= 30;

  const signatureWidth = (contentWidth - 40) / 2;
  
  // Left signature line
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

  // Right signature line
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

  // === FOOTER ===
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
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch proposal items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposalId);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    // Fetch vendor (user who created the proposal)
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
    let usedCustomTemplate = false;

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
        const processedDocx = await processDocxTemplate(templateBuffer, proposalData);

        // Convert processed DOCX to HTML
        const htmlContent = await convertDocxToHtml(processedDocx);
        
        // Use pdf-lib with the processed content
        // We still use our high-quality pdf-lib generator but it will use the template data
        pdfBuffer = await generatePdfWithPdfLib(proposalData, htmlContent);
        usedCustomTemplate = true;

        console.log('Custom template processed and PDF generated with pdf-lib');
      } catch (templateProcessError) {
        console.error('Error processing custom template, falling back to default:', templateProcessError);
        pdfBuffer = await generatePdfWithPdfLib(proposalData);
      }
    } else {
      console.log('No active template found, using default pdf-lib template');
      pdfBuffer = await generatePdfWithPdfLib(proposalData);
    }

    // Save PDF to storage
    const fileName = `${proposal.organization_id}/${proposal.proposal_number}.pdf`;
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('generated-pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save PDF', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('generated-pdfs')
      .getPublicUrl(fileName);

    // Update proposal with PDF URL
    await supabaseAdmin
      .from('proposals')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', proposalId);

    console.log(`PDF generated successfully: ${fileName} (custom template: ${usedCustomTemplate})`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        fileName: `${proposal.proposal_number}.pdf`,
        usedCustomTemplate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
