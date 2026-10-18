import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import type { EventStatus } from "@/features/events/types";

export interface EventFiltersValue {
  name: string;
  status: EventStatus | "all";
  date_from: string;
  date_to: string;
}

interface EventFiltersProps {
  value: EventFiltersValue;
  onChange: (value: EventFiltersValue) => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "finished", label: "Finalizado" },
];

const NAME_DEBOUNCE_MS = 400;

// useLatest local: solo lo necesita este hook de debounce (advanced-use-latest),
// no se promueve a una utilidad compartida porque no hay otro consumidor todavía.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/**
 * Puramente presentacional: expone onChange(filters), nunca llama a
 * useEvents directamente — EventsListPage posee el estado de filtros.
 * Solo `name` lleva debounce (400ms); status/date_from/date_to disparan
 * onChange de inmediato.
 */
export function EventFilters({ value, onChange }: EventFiltersProps) {
  const [nameDraft, setNameDraft] = useState(value.name);
  const latestValue = useLatest(value);
  const latestOnChange = useLatest(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleNameChange(next: string) {
    setNameDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      latestOnChange.current({ ...latestValue.current, name: next });
    }, NAME_DEBOUNCE_MS);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="event-filter-name" className="text-sm font-medium text-gray-900">
          Nombre
        </label>
        <Input
          id="event-filter-name"
          type="text"
          placeholder="Buscar por nombre"
          value={nameDraft}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-filter-status" className="text-sm font-medium text-gray-900">
          Estado
        </label>
        <Select
          id="event-filter-status"
          value={value.status}
          onValueChange={(status) =>
            onChange({ ...value, status: status as EventStatus | "all" })
          }
          options={STATUS_OPTIONS}
          aria-label="Estado"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-filter-date-from" className="text-sm font-medium text-gray-900">
          Desde
        </label>
        <Input
          id="event-filter-date-from"
          type="date"
          value={value.date_from}
          onChange={(event) => onChange({ ...value, date_from: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-filter-date-to" className="text-sm font-medium text-gray-900">
          Hasta
        </label>
        <Input
          id="event-filter-date-to"
          type="date"
          value={value.date_to}
          onChange={(event) => onChange({ ...value, date_to: event.target.value })}
        />
      </div>
    </div>
  );
}
