import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as mammoth from 'https://esm.sh/mammoth@1.6.0';
import PizZip from 'https://esm.sh/pizzip@3.1.7';
import Docxtemplater from 'https://esm.sh/docxtemplater@3.47.4';

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
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
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

// Convert DOCX to HTML using mammoth
async function convertDocxToHtml(docxBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: docxBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth conversion messages:', result.messages);
    }

    // Wrap the HTML content with proper styling
    const styledHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta Comercial</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      color: #3b82f6;
      margin-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 18px;
      color: #374151;
      margin: 20px 0 10px 0;
    }
    h3 {
      font-size: 14px;
      color: #4b5563;
      margin: 15px 0 8px 0;
    }
    p {
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin-bottom: 5px;
    }
    strong {
      font-weight: 600;
    }
    .highlight {
      background: #fef3c7;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #f59e0b;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  ${result.value}
</body>
</html>
    `;

    console.log('DOCX converted to HTML successfully');
    return styledHtml;
  } catch (error) {
    console.error('Error converting docx to HTML:', error);
    throw error;
  }
}

// Generate PDF from HTML content
function generatePdfFromHtmlContent(htmlContent: string): ArrayBuffer {
  // Create PDF structure with the HTML content embedded
  const encoder = new TextEncoder();
  
  // Extract text content for PDF (simplified approach)
  const textContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();

  // Escape special PDF characters
  const escapedContent = textContent
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n')
    .filter(line => line.trim())
    .map((line) => `(${line.substring(0, 100)}) Tj 0 -14 Td`)
    .join('\n');

  const streamContent = `BT\n/F1 10 Tf\n50 750 Td\n${escapedContent}\nET`;

  // Build PDF structure
  const pdfHeader = `%PDF-1.4\n`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`;

  const xrefOffset = pdfHeader.length + obj1.length + obj2.length + obj3.length + obj4.length + obj5.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000270 00000 n \n0000000${(pdfHeader.length + obj1.length + obj2.length + obj3.length + obj4.length).toString().padStart(3, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfContent = pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;

  return encoder.encode(pdfContent).buffer;
}

// Generate fallback HTML template (original method)
function generateFallbackHtml(data: ProposalData): string {
  const { proposal, items, vendor, organization, totalValue } = data;

  const itemsRows = items.map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.item_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(Number(item.item_price))}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${Number(item.discount).toFixed(0)}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(Number(item.subtotal))}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta ${proposal.proposal_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.5; color: #1f2937; background: white; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
    .company-info h1 { font-size: 24px; color: #3b82f6; margin-bottom: 5px; }
    .company-info p { color: #6b7280; }
    .proposal-info { text-align: right; }
    .proposal-number { font-size: 18px; font-weight: bold; color: #1f2937; }
    .proposal-date { color: #6b7280; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 14px; font-weight: 600; color: #3b82f6; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .client-field { margin-bottom: 10px; }
    .client-field label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .client-field p { font-size: 13px; color: #1f2937; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
    th:nth-child(2), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(5) { text-align: right; }
    .total-row { background: #3b82f6; color: white; }
    .total-row td { padding: 15px 12px; font-weight: bold; font-size: 14px; }
    .conditions { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .conditions h3 { font-size: 12px; color: #374151; margin-bottom: 10px; }
    .conditions p { color: #4b5563; font-size: 12px; }
    .validity-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 30px; }
    .validity-box p { color: #92400e; font-weight: 500; }
    .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
    .signature-line { border-top: 1px solid #1f2937; padding-top: 10px; text-align: center; }
    .signature-line p { font-size: 11px; color: #6b7280; }
    .vendor-info { text-align: center; color: #6b7280; font-size: 11px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>${organization?.name || 'Empresa'}</h1>
        <p>Proposta Comercial</p>
      </div>
      <div class="proposal-info">
        <div class="proposal-number">${proposal.proposal_number}</div>
        <div class="proposal-date">Emitida em: ${formatDate(proposal.created_at)}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Dados do Cliente</h2>
      <div class="client-grid">
        <div class="client-field">
          <label>Nome</label>
          <p>${proposal.client_name}</p>
        </div>
        ${proposal.client_company ? `
        <div class="client-field">
          <label>Empresa</label>
          <p>${proposal.client_company}</p>
        </div>
        ` : ''}
        ${proposal.client_email ? `
        <div class="client-field">
          <label>E-mail</label>
          <p>${proposal.client_email}</p>
        </div>
        ` : ''}
        ${proposal.client_whatsapp ? `
        <div class="client-field">
          <label>WhatsApp</label>
          <p>${proposal.client_whatsapp}</p>
        </div>
        ` : ''}
        ${proposal.client_address ? `
        <div class="client-field" style="grid-column: span 2;">
          <label>Endereço</label>
          <p>${proposal.client_address}</p>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Itens da Proposta</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Desc.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">VALOR TOTAL:</td>
            <td style="text-align: right;">${formatCurrency(totalValue)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${proposal.payment_conditions ? `
    <div class="conditions">
      <h3>Condições de Pagamento</h3>
      <p>${proposal.payment_conditions}</p>
    </div>
    ` : ''}

    <div class="validity-box">
      <p>⏱️ Esta proposta é válida por ${proposal.validity_days} dias${proposal.expires_at ? ` (até ${formatDate(proposal.expires_at)})` : ''}</p>
    </div>

    <div class="signature-area">
      <div class="signature-line">
        <p>${organization?.name || 'Fornecedor'}</p>
      </div>
      <div class="signature-line">
        <p>${proposal.client_name}</p>
      </div>
    </div>

    <div class="vendor-info">
      ${vendor ? `<p>Vendedor: ${vendor.name} | ${vendor.email}</p>` : ''}
      <p>Documento gerado automaticamente pelo ProposalFlow</p>
    </div>
  </div>
</body>
</html>
  `;
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
      formatCurrency,
      formatDate,
    };

    let htmlContent: string;
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
        htmlContent = await convertDocxToHtml(processedDocx);
        usedCustomTemplate = true;

        console.log('Custom template processed and converted to HTML');
      } catch (templateProcessError) {
        console.error('Error processing custom template, falling back to default:', templateProcessError);
        htmlContent = generateFallbackHtml(proposalData);
      }
    } else {
      console.log('No active template found, using default HTML template');
      htmlContent = generateFallbackHtml(proposalData);
    }

    // Generate PDF from HTML
    console.log(`Generating PDF using ${usedCustomTemplate ? 'custom template' : 'default template'}`);
    const pdfBuffer = generatePdfFromHtmlContent(htmlContent);

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
