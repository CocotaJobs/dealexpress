-- Allow admins to update their organization settings
CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (is_admin() AND id = get_user_organization_id())
WITH CHECK (is_admin() AND id = get_user_organization_id());