import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure access"
      title="Your documents, summaries, and study chat in one focused workspace."
      description="Authenticate with the completed backend and continue into a polished dashboard foundation."
    >
      <LoginForm />
    </AuthShell>
  );
}
