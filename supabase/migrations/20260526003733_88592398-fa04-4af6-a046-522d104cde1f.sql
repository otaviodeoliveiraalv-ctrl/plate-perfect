
REVOKE EXECUTE ON FUNCTION public.user_owns_tenant(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_tenant(UUID, UUID) TO authenticated;
