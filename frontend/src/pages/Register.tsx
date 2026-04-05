import React, { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { APIError } from "../api/error";
import { registerOptions } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const { updateToken } = useAuth();

  const { mutate: register, error } = useMutation({
    ...registerOptions,
    onSuccess: async (data) => {
      await updateToken(data.accessToken);
    },
  });

  const handleRegistration: React.FormEventHandler<
    HTMLFormElement
  > = (e) => {
    e.preventDefault();
    register({
      username,
      password,
      confirmPassword,
      email,
    });
  };

  const errorText = useMemo(() => {
    // TODO: handle validation and internal server errors
    if (error && error instanceof APIError) {
      return error.message;
    } else if (error) return "Unexpected error occured";
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleRegistration}
        className="bg-gray-800 p-6 rounded w-80 space-y-4"
      >
        <h1 className="text-white text-xl font-semibold">
          Register
        </h1>
        <p className="text-gray-500 text-sm">
          {" "}
          If you have an account{" "}
          <Link to="/login">login</Link>{" "}
        </p>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
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
          Register
        </Button>
      </form>
    </div>
  );
}
