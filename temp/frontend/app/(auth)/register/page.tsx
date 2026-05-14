import { Suspense } from "react";
import { AuthCard } from "../../../components/auth/auth-card";
import { RegisterForm } from "../../../components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Register">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
