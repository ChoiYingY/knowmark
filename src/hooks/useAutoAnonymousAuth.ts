import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Automatically signs the user in as an anonymous guest if they have no
 * active session. Safe to call from any page.
 *
 * Returns auth state so UI can avoid calling authenticated Convex queries
 * before the anonymous session is ready.
 */
export function useAutoAnonymousAuth() {
  const { signIn } = useAuthActions();
  const user = useQuery(api.auth.loggedInUser);
  const attempted = useRef(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // undefined = auth query still loading
    if (user === undefined) return;

    // User exists -> auth is ready
    if (user !== null) {
      setIsSigningIn(false);
      setAuthError(null);
      return;
    }

    // user === null -> no session yet, try anonymous sign-in once
    if (!attempted.current) {
      attempted.current = true;
      setIsSigningIn(true);
      setAuthError(null);

      signIn("anonymous")
        .catch((err) => {
          // Keep this non-fatal, but expose it so pages can show a message if needed
          const message =
            err instanceof Error ? err.message : "Anonymous sign-in failed";
          setAuthError(message);

          // Allow a future retry if the component remains mounted and user is still null
          attempted.current = false;
        })
        .finally(() => {
          setIsSigningIn(false);
        });
    }
  }, [user, signIn]);

  // "Ready" here means safe to call authenticated user-scoped queries/mutations
  const isAuthReady = user !== undefined && user !== null;
  const isAuthLoading = user === undefined;
  const isAnonymousSigningIn = user === null && isSigningIn;

  return {
    user,
    isAuthReady,
    isAuthLoading,
    isAnonymousSigningIn,
    authError,
  };
}