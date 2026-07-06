"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { register } from "@/services/auth-service";
import { registerSchema, type RegisterFormValues } from "@/features/auth/validation";
import { getApiErrorMessage } from "@/lib/api-client";

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    setSuccessMessage(null);
    try {
      await register(values);
      form.reset();
      setSuccessMessage("Account created. You can sign in now.");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Register with your email and start organizing documents with AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          {formError ? <Alert>{formError}</Alert> : null}
          {successMessage ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {successMessage}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              autoComplete="username"
              id="username"
              placeholder="manish"
              {...form.register("username")}
            />
            {form.formState.errors.username ? (
              <p className="text-sm text-rose-200">
                {form.formState.errors.username.message}
              </p>
            ) : null}
          </div>
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
              autoComplete="new-password"
              id="password"
              placeholder="At least 8 characters"
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
            Create account
          </Button>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link className="font-medium text-cyan-200 hover:text-cyan-100" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
