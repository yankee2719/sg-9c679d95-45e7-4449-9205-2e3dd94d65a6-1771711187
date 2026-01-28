import { LoginForm } from "@/components/Auth/LoginForm";
import { SEO } from "@/components/SEO";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Login - Industrial Maintenance"
        description="Accesso al portale di gestione manutenzioni"
      />
      <LoginForm />
    </>
  );
}