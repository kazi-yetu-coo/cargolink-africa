import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, checked } from "./supabase";
import type { Company, Role, WorkspaceKind } from "./types";
type WorkspaceContext = {
  company: Company | null;
  role: Role;
  is_admin: boolean;
  workspace: WorkspaceKind | null;
};
type Auth = {
  user: User | null;
  company: Company | null;
  role: Role;
  isAdmin: boolean;
  isReview: boolean;
  workspace: WorkspaceKind | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  switchWorkspace: (kind: WorkspaceKind) => Promise<Role>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [context, setContext] = useState<WorkspaceContext>({
      company: null,
      role: "customer",
      is_admin: false,
      workspace: null,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError")
        throw authError;
      setUser(data.user);
      if (!data.user) {
        setContext({
          company: null,
          role: "customer",
          is_admin: false,
          workspace: null,
        });
        return;
      }
      setContext(
        (await checked(
          supabase.rpc("get_workspace_context"),
        )) as WorkspaceContext,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your account.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        user,
        company: context.company,
        role: context.role,
        isAdmin: context.is_admin,
        isReview:
          context.is_admin &&
          context.workspace !== null &&
          context.workspace !== "admin",
        workspace: context.workspace,
        loading,
        error,
        refresh,
        switchWorkspace: async (kind) => {
          const next = (await checked(
            supabase.rpc("switch_admin_workspace", { p_workspace: kind }),
          )) as WorkspaceContext;
          setContext(next);
          return next.role;
        },
        signOut: async () => {
          await checked(supabase.auth.signOut());
          setUser(null);
          setContext({
            company: null,
            role: "customer",
            is_admin: false,
            workspace: null,
          });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Auth provider missing");
  return value;
}
