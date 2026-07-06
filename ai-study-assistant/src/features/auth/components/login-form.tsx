"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";
import { loginSchema, type LoginFormValues } from "@/features/auth/validation";
import { getApiErrorMessage } from "@/lib/api-client";

export function LoginForm() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue to your AI study workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          {formError ? <Alert>{formError}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              placeholder="you@example.com"
              type="email"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-rose-200">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete="current-password"
              id="password"
              placeholder="Enter your password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-rose-200">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Sign in
          </Button>
          <p className="text-center text-sm text-slate-400">
            New here?{" "}
            <Link className="font-medium text-cyan-200 hover:text-cyan-100" href="/register">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
