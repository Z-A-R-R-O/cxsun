import { Suspense } from "react";
import { AuthCard } from "../../../components/auth/auth-card";
import { ResetPasswordForm } from "../../../components/auth/reset-password-form";

export default function PasswordResetPage() {
  return (
    <AuthCard title="Reset password">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
