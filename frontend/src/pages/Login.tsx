import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { loginOptions } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { APIError } from "../api/error";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function Login() {
  const { updateToken } = useAuth();
  const { mutate: loginMutation, error } = useMutation({
    ...loginOptions,
    onSuccess: async (data) => {
      await updateToken(data.accessToken);
    },
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const errorText = useMemo(() => {
    // TODO: handle validation and internal server errors
    if (error && error instanceof APIError) {
      return error.message;
    } else if (error) return "Unexpected error occured";
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation({ password, email });
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded w-80 space-y-4"
      >
        <h1 className="text-white text-xl font-semibold">
          Login
        </h1>
        <p className="text-gray-500 text-sm">
          If you don't have an account{" "}
          <Link to="/register">register</Link>
        </p>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorText && (
          <p className="text-red-400 text-sm">
            {errorText}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-indigo-600"
        >
          Login
        </Button>
      </form>
    </div>
  );
}
