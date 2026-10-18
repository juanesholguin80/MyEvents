import Plus from "lucide-react/dist/esm/icons/plus";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import { SpeakerFormDialog } from "@/components/speakers/SpeakerFormDialog";
import { useAuthStore } from "@/features/auth/store";
import { useSpeakers } from "@/features/speakers/hooks";

interface SpeakerSelectProps {
  value: number | null;
  onChange: (speakerId: number) => void;
  id?: string;
  "aria-describedby"?: string;
}

// Catálogo de ponentes esperado chico para esta prueba técnica (sin un
// combobox con búsqueda de texto): una sola página grande alcanza para que
// el <Select> liste todos los ponentes sin paginar.
const SPEAKER_OPTIONS_PAGE_SIZE = 100;

/**
 * Combobox de ponentes para usar dentro de `SessionFormDialog` (§5 del
 * plan). Su rol central es cargar + seleccionar, por eso usa su propio
 * hook (`useSpeakers`) en vez de recibir los datos ya resueltos — mismo
 * criterio ya aprobado para `EventFilters`/`EventActions` en fases
 * previas, a diferencia de `SessionList` (puramente presentacional, recibe
 * los ponentes como prop).
 *
 * Se auto-protege: la acción rápida "crear ponente nuevo" solo aparece si
 * el usuario autenticado es organizador o admin (§2.4: `POST /speakers`
 * exige ese rol), sin depender de que el padre recuerde pasar un flag —
 * mismo patrón de auto-protección que `EventActions` con `isOwnerOrAdmin`.
 */
export function SpeakerSelect({ value, onChange, id, ...aria }: SpeakerSelectProps) {
  const user = useAuthStore((s) => s.user);
  const canCreateSpeaker = user?.role === "organizador" || user?.role === "admin";
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const speakersQuery = useSpeakers({ page_size: SPEAKER_OPTIONS_PAGE_SIZE });

  const options: SelectOption[] = (speakersQuery.data?.items ?? []).map((speaker) => ({
    value: String(speaker.id),
    label: speaker.full_name,
  }));

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <Select
          id={id}
          value={value !== null ? String(value) : ""}
          onValueChange={(next) => onChange(Number(next))}
          options={options}
          placeholder={
            speakersQuery.isLoading ? "Cargando ponentes..." : "Selecciona un ponente"
          }
          disabled={speakersQuery.isLoading}
          {...aria}
        />
      </div>
      {canCreateSpeaker ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo
          </Button>
          <SpeakerFormDialog
            mode="create"
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSaved={(speaker) => {
              onChange(speaker.id);
              setIsCreateOpen(false);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
