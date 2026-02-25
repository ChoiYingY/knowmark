import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Module-level guard so multiple hook instances / StrictMode remounts
// don't trigger duplicate anonymous sign-ins.
let anonymousSignInInFlight: Promise<unknown> | null = null;

export function useAutoAnonymousAuth() {
  const { signIn } = useAuthActions();
  const { isLoading: isAuthProviderLoading } = useConvexAuth();
  const user = useQuery(api.auth.loggedInUser);

  const attempted = useRef(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for provider to restore persisted auth state first
    if (isAuthProviderLoading) return;

    // Query still loading
    if (user === undefined) return;

    // Existing session/user found
    if (user !== null) {
      setIsSigningIn(false);
      setAuthError(null);
      return;
    }

    // If another instance/remount already started sign-in, don't start again
    if (anonymousSignInInFlight) {
      setIsSigningIn(true);
      return;
    }

    // Per-instance guard (helps StrictMode effect re-runs)
    if (attempted.current) return;
    attempted.current = true;

    setIsSigningIn(true);
    setAuthError(null);

    const p = signIn("anonymous");
    anonymousSignInInFlight = p;

    p.catch((err) => {
      const message =
        err instanceof Error ? err.message : "Anonymous sign-in failed";
      setAuthError(message);

      // allow retry if sign-in failed
      attempted.current = false;
    }).finally(() => {
      anonymousSignInInFlight = null;
      setIsSigningIn(false);
    });
  }, [isAuthProviderLoading, user, signIn]);

  const isAuthLoading = isAuthProviderLoading || user === undefined;
  const isAuthReady = !isAuthLoading && user !== null;
  const isAnonymousSigningIn = !isAuthLoading && user === null && isSigningIn;

  return {
    user,
    isAuthReady,
    isAuthLoading,
    isAnonymousSigningIn,
    authError,
  };
}