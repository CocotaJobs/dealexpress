-- Add column to store QR code temporarily in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT;
