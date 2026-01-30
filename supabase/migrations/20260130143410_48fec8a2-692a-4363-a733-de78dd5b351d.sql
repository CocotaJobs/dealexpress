-- Add client_cnpj column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN client_cnpj text;