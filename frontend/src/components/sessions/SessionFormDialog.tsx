import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { SpeakerSelect } from "@/components/speakers/SpeakerSelect";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import type { EventRead } from "@/features/events/types";
import type { SessionCreateInput } from "@/features/sessions/api";
import { useCreateSession, useUpdateSession } from "@/features/sessions/hooks";
import type { SessionFormValues } from "@/features/sessions/schemas";
import { createSessionFormSchema } from "@/features/sessions/schemas";
import type { SessionRead } from "@/features/sessions/types";
import { applyApiErrorToForm, messageForApiError, normalizeApiError } from "@/lib/errors";

interface SessionFormDialogProps {
  mode: "create" | "edit";
  event: EventRead;
  session?: SessionRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// ISO con offset -> valor que acepta un <input type="datetime-local">
// (mismo helper que usa EventForm).
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function buildDefaultValues(session?: SessionRead): Partial<SessionFormValues> {
  if (!session) return {};
  return {
    speaker_id: session.speaker_id,
    title: session.title,
    description: session.description ?? "",
    start_time: toDatetimeLocalValue(session.start_time),
    end_time: toDatetimeLocalValue(session.end_time),
    capacity: session.capacity,
  };
}

/**
 * Modal de creación/edición de sesión (§5/§6, Fase 5 del plan). El
 * `datetime-local` de inicio/fin se acota con `min`/`max` al rango
 * `[event.start_date, event.end_date]` (§2.4), además de la validación de
 * Zod que replica la misma regla (y la de cupo) para feedback inmediato
 * sin esperar el 422 del servidor. El solapamiento de ponente
 * (`SESSION_OVERLAP`) solo lo puede detectar el backend; se muestra vía
 * toast + `applyApiErrorToForm` cuando llega el 422.
 */
export function SessionFormDialog({
  mode,
  event,
  session,
  open,
  onOpenChange,
}: SessionFormDialogProps) {
  const createMutation = useCreateSession(event.id);
  const updateMutation = useUpdateSession(event.id, session?.id ?? NaN);

  const schema = createSessionFormSchema(event);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(session),
  });

  // Reinicia el formulario cada vez que el modal se abre (modo crear: en
  // blanco; modo editar: precargado con la sesión actual).
  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(session));
    }
  }, [open, session, reset]);

  const isSubmitting = mode === "create" ? createMutation.isPending : updateMutation.isPending;

  const eventMin = toDatetimeLocalValue(event.start_date);
  const eventMax = toDatetimeLocalValue(event.end_date);

  const submit = handleSubmit((values) => {
    const trimmedDescription = values.description?.trim() ?? "";
    const input: SessionCreateInput = {
      speaker_id: values.speaker_id,
      title: values.title,
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
      capacity: values.capacity,
    };

    const callbacks = {
      onSuccess: () => {
        toast.success(mode === "create" ? "Sesión creada." : "Sesión actualizada.");
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        const apiError = normalizeApiError(error);
        applyApiErrorToForm(setError, apiError);
        toast.error(messageForApiError(apiError));
      },
    };

    if (mode === "edit" && session) {
      updateMutation.mutate(input, callbacks);
      return;
    }
    createMutation.mutate(input, callbacks);
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Agregar sesión" : "Editar sesión"}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="Título" error={errors.title?.message}>
          {(fieldProps) => <Input {...fieldProps} {...register("title")} />}
        </FormField>
        <FormField label="Descripción" error={errors.description?.message}>
          {(fieldProps) => <Textarea {...fieldProps} {...register("description")} />}
        </FormField>
        <FormField label="Ponente" error={errors.speaker_id?.message}>
          {(fieldProps) => (
            <Controller
              control={control}
              name="speaker_id"
              render={({ field }) => (
                <SpeakerSelect
                  id={fieldProps.id}
                  aria-describedby={fieldProps["aria-describedby"]}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </FormField>
        <FormField label="Fecha y hora de inicio" error={errors.start_time?.message}>
          {(fieldProps) => (
            <Input
              type="datetime-local"
              min={eventMin}
              max={eventMax}
              {...fieldProps}
              {...register("start_time")}
            />
          )}
        </FormField>
        <FormField label="Fecha y hora de fin" error={errors.end_time?.message}>
          {(fieldProps) => (
            <Input
              type="datetime-local"
              min={eventMin}
              max={eventMax}
              {...fieldProps}
              {...register("end_time")}
            />
          )}
        </FormField>
        <FormField label="Cupo" error={errors.capacity?.message}>
          {(fieldProps) => (
            <Input
              type="number"
              min={1}
              max={event.capacity}
              {...fieldProps}
              {...register("capacity")}
            />
          )}
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando..."
            : mode === "create"
              ? "Crear sesión"
              : "Guardar cambios"}
        </Button>
      </form>
    </Modal>
  );
}
