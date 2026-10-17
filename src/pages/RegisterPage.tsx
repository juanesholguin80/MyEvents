import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/features/auth/hooks";
import type { RegisterFormValues } from "@/features/auth/schemas";
import { registerSchema } from "@/features/auth/schemas";
import { applyApiErrorToForm, messageForApiError, normalizeApiError } from "@/lib/errors";

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Cuenta creada. Ahora puedes iniciar sesión.");
        navigate("/login", { replace: true });
      },
      onError: (error) => {
        const apiError = normalizeApiError(error);
        applyApiErrorToForm(setError, apiError);
        toast.error(messageForApiError(apiError));
      },
    });
  });

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Nombre completo" error={errors.full_name?.message}>
          {(fieldProps) => <Input {...fieldProps} {...registerField("full_name")} />}
        </FormField>
        <FormField label="Correo" error={errors.email?.message}>
          {(fieldProps) => (
            <Input type="email" {...fieldProps} {...registerField("email")} />
          )}
        </FormField>
        <FormField label="Contraseña" error={errors.password?.message}>
          {(fieldProps) => (
            <Input type="password" {...fieldProps} {...registerField("password")} />
          )}
        </FormField>
        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Creando..." : "Crear cuenta"}
        </Button>
      </form>
      <p className="text-sm text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
