-- Add public key storage to profiles (public keys are safe to store server-side)
alter table public.profiles add column if not exists public_key text;

-- Add IV column to messages (needed for AES-GCM decryption)
alter table public.messages add column if not exists iv text;

-- Remove the plaintext-length constraint — body now stores base64 ciphertext
-- (plaintext length is enforced in the UI before encryption)
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) > 0 and char_length(body) <= 8000);
