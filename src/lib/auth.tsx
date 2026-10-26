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
import type { Company, Role } from "./types";
type Auth = {
  user: User | null;
  company: Company | null;
  role: Role;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [company, setCompany] = useState<Company | null>(null),
    [role, setRole] = useState<Role>("customer"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError")
        throw authError;
      const u = data.user;
      setUser(u);
      if (!u) {
        setCompany(null);
        setRole("customer");
        return;
      }
      const [companies, admins] = await Promise.all([
        checked(
          supabase
            .from("companies")
            .select("*")
            .eq("owner_id", u.id)
            .order("created_at")
            .limit(1),
        ),
        checked(
          supabase
            .from("platform_admins")
            .select("user_id")
            .eq("user_id", u.id),
        ),
      ]);
      const c = (companies?.[0] as Company) || null;
      setCompany(c);
      setRole(
        admins?.length
          ? "admin"
          : c?.role === "shipper"
            ? "customer"
            : "provider",
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
        company,
        role,
        loading,
        error,
        refresh,
        signOut: async () => {
          await checked(supabase.auth.signOut());
          setUser(null);
          setCompany(null);
          setRole("customer");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const v = useContext(Context);
  if (!v) throw new Error("Auth provider missing");
  return v;
}
