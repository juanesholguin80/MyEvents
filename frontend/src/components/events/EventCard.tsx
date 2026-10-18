import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Users from "lucide-react/dist/esm/icons/users";
import { Link } from "react-router-dom";
import { EventCover } from "@/components/events/EventCover";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import type { EventRead } from "@/features/events/types";

interface EventCardProps {
  event: EventRead;
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Componente presentacional: sin fetch, sin hooks de datos. Navega con
// <Link>, no con un <div onClick>, para foco visible y navegación por
// teclado nativos.
export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <EventCover eventId={event.id} />
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">{event.name}</h2>
        <EventStatusBadge status={event.status} />
      </div>
      <p className="flex items-center gap-1.5 text-sm text-gray-600">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        {event.location}
      </p>
      <p className="text-sm text-gray-600">
        {dateFormatter.format(new Date(event.start_date))}
      </p>
      <p className="flex items-center gap-1.5 text-sm text-gray-600">
        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
        Cupo: {event.capacity}
      </p>
    </Link>
  );
}
