import { useState } from "react";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters } from "@/components/events/EventFilters";
import type { EventFiltersValue } from "@/components/events/EventFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEvents } from "@/features/events/hooks";

const PAGE_SIZE = 12;

const DEFAULT_FILTERS: EventFiltersValue = {
  name: "",
  status: "all",
  date_from: "",
  date_to: "",
};

export default function EventsListPage() {
  const [filters, setFilters] = useState<EventFiltersValue>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const eventsQuery = useEvents({
    name: filters.name || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  function handleFiltersChange(next: EventFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  const items = eventsQuery.data?.items ?? [];
  const hasItems = items.length > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Eventos</h1>
      <EventFilters value={filters} onChange={handleFiltersChange} />

      {eventsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : null}

      {eventsQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          No se pudieron cargar los eventos. Intenta de nuevo.
        </p>
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.isError && !hasItems ? (
        <p className="text-sm text-gray-600">No hay eventos con estos filtros.</p>
      ) : null}

      {hasItems ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Pagination
            page={eventsQuery.data!.page}
            pageSize={eventsQuery.data!.page_size}
            total={eventsQuery.data!.total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
