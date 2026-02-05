-- Alterar a precisão do campo discount para suportar valores maiores
ALTER TABLE public.proposal_items 
ALTER COLUMN discount TYPE numeric(12,2);