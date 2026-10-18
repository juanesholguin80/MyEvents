import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { EventCreateInput } from "@/features/events/api";
import type { EventFormValues } from "@/features/events/schemas";
import { eventFormSchema } from "@/features/events/schemas";
import { applyApiErrorToForm } from "@/lib/errors";
import type { ApiError } from "@/types/api";

// Subconjunto de EventRead que necesita la precarga en modo editar. Se
// recibe en ISO (igual que viene del backend); EventForm lo convierte a
// datetime-local internamente.
export interface EventFormDefaults {
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number;
}

interface EventFormProps {
  mode: "create" | "edit";
  defaultValues?: EventFormDefaults;
  onSubmit: (values: EventCreateInput) => void;
  isSubmitting: boolean;
  serverError?: ApiError | null;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// ISO con offset -> valor que acepta un <input type="datetime-local"> (sin
// offset, en hora local del navegador).
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function buildDefaultFormValues(defaults?: EventFormDefaults): Partial<EventFormValues> {
  if (!defaults) return {};
  return {
    name: defaults.name,
    description: defaults.description ?? "",
    location: defaults.location,
    start_date: toDatetimeLocalValue(defaults.start_date),
    end_date: toDatetimeLocalValue(defaults.end_date),
    capacity: defaults.capacity,
  };
}

/**
 * FormularioEvento (§5 del plan): usado por `EventFormPage` en modo crear y
 * editar vía la prop `mode`. Encapsula la validación (RHF + Zod) y la
 * conversión de fechas; el fetch real (crear/actualizar) vive en los hooks
 * de `features/events` y lo dispara el padre a través de `onSubmit`.
 */
export function EventForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
  serverError,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: buildDefaultFormValues(defaultValues),
  });

  useEffect(() => {
    if (serverError?.fields) {
      applyApiErrorToForm(setError, serverError);
    }
  }, [serverError, setError]);

  const submit = handleSubmit((values) => {
    const trimmedDescription = values.description?.trim() ?? "";
    onSubmit({
      name: values.name,
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
      location: values.location,
      // Conversión a ISO con offset justo antes de enviar (§6, Fase 4).
      start_date: new Date(values.start_date).toISOString(),
      end_date: new Date(values.end_date).toISOString(),
      capacity: values.capacity,
    });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField label="Nombre" error={errors.name?.message}>
        {(fieldProps) => <Input {...fieldProps} {...register("name")} />}
      </FormField>
      <FormField label="Descripción" error={errors.description?.message}>
        {(fieldProps) => <Textarea {...fieldProps} {...register("description")} />}
      </FormField>
      <FormField label="Ubicación" error={errors.location?.message}>
        {(fieldProps) => <Input {...fieldProps} {...register("location")} />}
      </FormField>
      <FormField label="Fecha y hora de inicio" error={errors.start_date?.message}>
        {(fieldProps) => (
          <Input type="datetime-local" {...fieldProps} {...register("start_date")} />
        )}
      </FormField>
      <FormField label="Fecha y hora de fin" error={errors.end_date?.message}>
        {(fieldProps) => (
          <Input type="datetime-local" {...fieldProps} {...register("end_date")} />
        )}
      </FormField>
      <FormField label="Cupo" error={errors.capacity?.message}>
        {(fieldProps) => (
          <Input type="number" min={1} {...fieldProps} {...register("capacity")} />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Guardando..."
          : mode === "create"
            ? "Crear evento"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
