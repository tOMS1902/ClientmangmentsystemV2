-- Allow clients to update their own record (e.g. weight_unit preference)
CREATE POLICY "client_update_own_record" ON clients FOR UPDATE
  USING (user_id = auth.uid());
