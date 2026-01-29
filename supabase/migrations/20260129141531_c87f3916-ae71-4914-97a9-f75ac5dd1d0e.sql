-- Fix search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for generate_proposal_number function
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 'PROP-' || year_month || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.proposals
  WHERE organization_id = NEW.organization_id
    AND proposal_number LIKE 'PROP-' || year_month || '-%';
  
  new_number := 'PROP-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.proposal_number := new_number;
  
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + (NEW.validity_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;