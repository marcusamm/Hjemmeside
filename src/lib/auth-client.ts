// Client-side auth helpers: a React Query options object for the current user,
// and a useAuth() hook. Safe to import anywhere.
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentUser } from "./auth.functions";
import { userCan, type Capability, type SessionUser } from "./auth-config";

export const currentUserQueryOptions = queryOptions<SessionUser | null>({
  queryKey: ["auth", "me"],
  queryFn: () => getCurrentUser(),
  staleTime: 60_000,
});

export function useAuth() {
  const { data } = useSuspenseQuery(currentUserQueryOptions);
  const user = data ?? null;
  return {
    user,
    isAuthenticated: !!user,
    can: (cap: Capability) => userCan(user, cap),
  };
}
