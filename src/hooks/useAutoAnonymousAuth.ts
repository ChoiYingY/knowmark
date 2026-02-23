import { useEffect, useRef } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Automatically signs the user in as an anonymous guest if they have no
 * active session. Fires once on mount. Safe to call from any page.
 */
export function useAutoAnonymousAuth() {
  const { signIn } = useAuthActions();
  const user = useQuery(api.auth.loggedInUser);
  const attempted = useRef(false);

  useEffect(() => {
    // user === undefined means query is still loading; null means no session
    if (user === null && !attempted.current) {
      attempted.current = true;
      signIn("anonymous").catch(() => {
        // Silent fail — Convex mutations will surface auth errors naturally
      });
    }
  }, [user, signIn]);
}
