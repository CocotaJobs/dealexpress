-- Tipo de desconto nos itens da proposta
ALTER TABLE proposal_items 
ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage' 
CHECK (discount_type IN ('percentage', 'fixed'));

-- Frete padrão na organização
ALTER TABLE organizations 
ADD COLUMN default_shipping TEXT DEFAULT 'A combinar';

-- Frete personalizado na proposta
ALTER TABLE proposals 
ADD COLUMN shipping TEXT;