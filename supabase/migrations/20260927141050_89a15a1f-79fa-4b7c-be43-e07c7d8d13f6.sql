REVOKE EXECUTE ON FUNCTION public.can_view_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_history(uuid) TO authenticated;