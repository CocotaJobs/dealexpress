ALTER TABLE public.proposals ADD COLUMN technical_training_text text;
UPDATE public.proposals SET technical_training_text = CASE WHEN technical_training THEN 'Sim' ELSE NULL END WHERE technical_training;
COMMENT ON COLUMN public.proposals.technical_training IS 'DEPRECATED: replaced by technical_training_text';