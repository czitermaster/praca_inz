import { Outlet } from "react-router";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext";

const qc = new QueryClient();

export function IndexLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
