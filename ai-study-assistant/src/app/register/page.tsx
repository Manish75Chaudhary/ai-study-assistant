import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Build a private AI study system around the documents you trust."
      description="Register through the backend API, then sign in to the dashboard shell for Phase 1."
    >
      <RegisterForm />
    </AuthShell>
  );
}
