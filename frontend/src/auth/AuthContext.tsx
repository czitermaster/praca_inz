import { createContext, useContext } from "react";
import { useNavigate } from "react-router";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  authKeyFactory,
  getMeOptions,
  type User,
} from "../api/auth";
import { tokenStorage } from "./token";

type AuthContextValue = {
  user: User | undefined;
  loading: boolean;
  updateToken: (token: string) => Promise<void>;
  error: Error | undefined;
  logout: () => void;
};

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: user,
    isLoading: loading,
    error,
  } = useQuery({
    ...getMeOptions,
  });

  const navigate = useNavigate();

  const qc = useQueryClient();

  async function updateToken(token: string) {
    tokenStorage.set(token);
    await qc.refetchQueries({
      queryKey: authKeyFactory.me(),
    });
    navigate("/");
  }

  function logout() {
    tokenStorage.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        updateToken,
        logout,
        error: error || undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth needs to be used inside of AuthContext"
    );
  }
  return context;
}
