import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePdfRequest {
  proposalId: string;
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
    const totalValue = (items || []).reduce((sum: number, item: { subtotal: number }) => sum + Number(item.subtotal), 0);

    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    // Format date
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    // Generate HTML content
    const htmlContent = generateProposalHtml({
      proposal,
      items: items || [],
      vendor,
      organization,
      totalValue,
      formatCurrency,
      formatDate,
    });

    // Use html2pdf.app API to convert HTML to PDF
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        apiKey: '7a5d5c1d5e1b4a7a9d1f3b5c7e9f1b3d', // Free tier key for demo
        options: {
          format: 'A4',
          margin: {
            top: '10mm',
            bottom: '10mm',
            left: '15mm',
            right: '15mm',
          },
        },
      }),
    });

    let pdfBuffer: ArrayBuffer;

    if (!pdfResponse.ok) {
      console.log('html2pdf.app failed, using fallback PDF generation');
      // Fallback: Generate a simple PDF using data URI
      pdfBuffer = await generateSimplePdf({
        proposal,
        items: items || [],
        vendor,
        organization,
        totalValue,
        formatCurrency,
        formatDate,
      });
    } else {
      pdfBuffer = await pdfResponse.arrayBuffer();
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

    console.log(`PDF generated successfully: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        fileName: `${proposal.proposal_number}.pdf`,
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
  items: Array<{
    item_name: string;
    quantity: number;
    item_price: number;
    discount: number;
    subtotal: number;
  }>;
  vendor?: { name: string; email: string } | null;
  organization?: { name: string } | null;
  totalValue: number;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

function generateProposalHtml(data: ProposalData): string {
  const { proposal, items, vendor, organization, totalValue, formatCurrency, formatDate } = data;

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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    .company-info h1 {
      font-size: 24px;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    .company-info p {
      color: #6b7280;
    }
    .proposal-info {
      text-align: right;
    }
    .proposal-number {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
    }
    .proposal-date {
      color: #6b7280;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    .client-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .client-field {
      margin-bottom: 10px;
    }
    .client-field label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .client-field p {
      font-size: 13px;
      color: #1f2937;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: #4b5563;
      border-bottom: 2px solid #e5e7eb;
    }
    th:nth-child(2), th:nth-child(4) {
      text-align: center;
    }
    th:nth-child(3), th:nth-child(5) {
      text-align: right;
    }
    .total-row {
      background: #3b82f6;
      color: white;
    }
    .total-row td {
      padding: 15px 12px;
      font-weight: bold;
      font-size: 14px;
    }
    .conditions {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .conditions h3 {
      font-size: 12px;
      color: #374151;
      margin-bottom: 10px;
    }
    .conditions p {
      color: #4b5563;
      font-size: 12px;
    }
    .validity-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      margin-bottom: 30px;
    }
    .validity-box p {
      color: #92400e;
      font-weight: 500;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    .signature-line {
      border-top: 1px solid #1f2937;
      padding-top: 10px;
      text-align: center;
    }
    .signature-line p {
      font-size: 11px;
      color: #6b7280;
    }
    .vendor-info {
      text-align: center;
      color: #6b7280;
      font-size: 11px;
      margin-top: 20px;
    }
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

async function generateSimplePdf(data: ProposalData): Promise<ArrayBuffer> {
  // Simple PDF generation using a basic approach
  // This creates a minimal valid PDF structure
  const { proposal, items, organization, totalValue, formatCurrency, formatDate } = data;
  
  // Build text content
  let content = `PROPOSTA COMERCIAL\n`;
  content += `=====================================\n\n`;
  content += `Número: ${proposal.proposal_number}\n`;
  content += `Data: ${formatDate(proposal.created_at)}\n`;
  content += `Empresa: ${organization?.name || 'N/A'}\n\n`;
  content += `CLIENTE\n`;
  content += `-------------------------------------\n`;
  content += `Nome: ${proposal.client_name}\n`;
  if (proposal.client_company) content += `Empresa: ${proposal.client_company}\n`;
  if (proposal.client_email) content += `Email: ${proposal.client_email}\n`;
  if (proposal.client_whatsapp) content += `WhatsApp: ${proposal.client_whatsapp}\n`;
  if (proposal.client_address) content += `Endereço: ${proposal.client_address}\n`;
  content += `\n`;
  content += `ITENS\n`;
  content += `-------------------------------------\n`;
  
  items.forEach((item, i) => {
    content += `${i + 1}. ${item.item_name}\n`;
    content += `   Qtd: ${item.quantity} x ${formatCurrency(Number(item.item_price))}`;
    if (Number(item.discount) > 0) content += ` (-${Number(item.discount)}%)`;
    content += ` = ${formatCurrency(Number(item.subtotal))}\n`;
  });
  
  content += `\n-------------------------------------\n`;
  content += `VALOR TOTAL: ${formatCurrency(totalValue)}\n`;
  content += `-------------------------------------\n\n`;
  
  if (proposal.payment_conditions) {
    content += `CONDIÇÕES DE PAGAMENTO\n`;
    content += `${proposal.payment_conditions}\n\n`;
  }
  
  content += `Validade: ${proposal.validity_days} dias\n`;
  
  // Create a simple PDF (text-based for compatibility)
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(content);
  
  // Create PDF structure
  const pdfHeader = `%PDF-1.4\n`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3Start = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  
  // Escape special PDF characters in content
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n')
    .map((line, i) => `(${line}) Tj 0 -14 Td`)
    .join('\n');
  
  const streamContent = `BT\n/F1 10 Tf\n50 750 Td\n${escapedContent}\nET`;
  const obj4 = `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`;
  
  const xrefOffset = pdfHeader.length + obj1.length + obj2.length + obj3Start.length + obj4.length + obj5.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000270 00000 n \n0000000${(pdfHeader.length + obj1.length + obj2.length + obj3Start.length + obj4.length).toString().padStart(3, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  
  const pdfContent = pdfHeader + obj1 + obj2 + obj3Start + obj4 + obj5 + xref + trailer;
  
  return encoder.encode(pdfContent).buffer;
}
