import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useCreateSpeaker, useUpdateSpeaker } from "@/features/speakers/hooks";
import type { SpeakerFormValues } from "@/features/speakers/schemas";
import { speakerFormSchema } from "@/features/speakers/schemas";
import type { SpeakerRead } from "@/features/speakers/types";
import { applyApiErrorToForm, messageForApiError, normalizeApiError } from "@/lib/errors";

interface SpeakerFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speaker?: SpeakerRead;
  onSaved?: (speaker: SpeakerRead) => void;
}

function buildDefaultValues(speaker?: SpeakerRead): Partial<SpeakerFormValues> {
  if (!speaker) return {};
  return {
    full_name: speaker.full_name,
    bio: speaker.bio ?? "",
    email: speaker.email,
  };
}

/**
 * Modal de crear/editar ponente (§5, Fase 5 del plan). Se usa sobre todo
 * desde `SpeakerSelect` como la acción rápida "crear ponente nuevo" dentro
 * del formulario de sesión, sin salir de él. El fetch (crear/actualizar)
 * vive en los hooks de `features/speakers`, llamados aquí directamente
 * porque el rol central de este componente es justamente esa mutación
 * (mismo criterio que `EventActions`/`EventFormPage`).
 */
export function SpeakerFormDialog({
  mode,
  open,
  onOpenChange,
  speaker,
  onSaved,
}: SpeakerFormDialogProps) {
  const createMutation = useCreateSpeaker();
  const updateMutation = useUpdateSpeaker(speaker?.id ?? NaN);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SpeakerFormValues>({
    resolver: zodResolver(speakerFormSchema),
    defaultValues: buildDefaultValues(speaker),
  });

  // Reinicia el formulario cada vez que el modal se abre (modo crear: en
  // blanco; modo editar: precargado con el ponente actual).
  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(speaker));
    }
  }, [open, speaker, reset]);

  const isSubmitting = mode === "create" ? createMutation.isPending : updateMutation.isPending;

  const submit = handleSubmit((values) => {
    const trimmedBio = values.bio?.trim() ?? "";
    const input = {
      full_name: values.full_name,
      bio: trimmedBio.length > 0 ? trimmedBio : null,
      email: values.email,
    };

    const callbacks = {
      onSuccess: (saved: SpeakerRead) => {
        toast.success(mode === "create" ? "Ponente creado." : "Ponente actualizado.");
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error: unknown) => {
        const apiError = normalizeApiError(error);
        applyApiErrorToForm(setError, apiError);
        toast.error(messageForApiError(apiError));
      },
    };

    if (mode === "edit" && speaker) {
      updateMutation.mutate(input, callbacks);
      return;
    }
    createMutation.mutate(input, callbacks);
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Nuevo ponente" : "Editar ponente"}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="Nombre completo" error={errors.full_name?.message}>
          {(fieldProps) => <Input {...fieldProps} {...register("full_name")} />}
        </FormField>
        <FormField label="Correo" error={errors.email?.message}>
          {(fieldProps) => <Input type="email" {...fieldProps} {...register("email")} />}
        </FormField>
        <FormField label="Biografía" error={errors.bio?.message}>
          {(fieldProps) => <Textarea {...fieldProps} {...register("bio")} />}
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando..."
            : mode === "create"
              ? "Crear ponente"
              : "Guardar cambios"}
        </Button>
      </form>
    </Modal>
  );
}
