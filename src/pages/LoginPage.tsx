import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/features/auth/hooks";
import type { LoginFormValues } from "@/features/auth/schemas";
import { loginSchema } from "@/features/auth/schemas";
import { messageForApiError, normalizeApiError } from "@/lib/errors";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        navigate(searchParams.get("redirect") ?? "/", { replace: true });
      },
      onError: (error) => {
        toast.error(messageForApiError(normalizeApiError(error)));
      },
    });
  });

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Correo" error={errors.email?.message}>
          {(fieldProps) => <Input type="email" {...fieldProps} {...register("email")} />}
        </FormField>
        <FormField label="Contraseña" error={errors.password?.message}>
          {(fieldProps) => (
            <Input type="password" {...fieldProps} {...register("password")} />
          )}
        </FormField>
        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
      <p className="text-sm text-gray-600">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
