export interface ClientRequiredFields {
  clientCompany: string;
  clientDocument: string;
  clientName: string;
  clientWhatsApp: string;
}

/** Returns the first validation error message, or null when valid. */
export function validateClientFields(f: ClientRequiredFields): string | null {
  if (!f.clientCompany.trim()) return 'Preencha o nome da empresa.';
  const doc = f.clientDocument.replace(/\D/g, '');
  if (!doc) return 'Preencha o CPF ou CNPJ.';
  if (doc.length !== 11 && doc.length !== 14) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) completo.';
  if (!f.clientName.trim()) return 'Preencha o nome do cliente/contato.';
  const phone = f.clientWhatsApp.replace(/\D/g, '');
  if (!phone) return 'Preencha o telefone/WhatsApp.';
  if (phone.length < 10 || phone.length > 11) return 'Informe um telefone/WhatsApp válido com DDD.';
  return null;
}
