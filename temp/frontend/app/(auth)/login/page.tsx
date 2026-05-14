import { Suspense } from "react";
import { AuthCard } from "../../../components/auth/auth-card";
import { LoginForm } from "../../../components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard title="Welcome" description="Sign in to continue to your workspace.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
