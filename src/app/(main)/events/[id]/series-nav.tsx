import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

interface Props {
  eventId: string;
  seriesId: string;
  seriesIndex: number;
}

export async function SeriesNav({ eventId, seriesId, seriesIndex }: Props) {
  const supabase = await createClient();

  const { data: occurrences } = await supabase.rpc("get_series_occurrences", {
    p_series_id: seriesId,
  });

  if (!occurrences || occurrences.length < 2) return null;

  const active = occurrences.filter(
    (o: { deleted_at: string | null }) => !o.deleted_at
  );

  const currentIdx = active.findIndex(
    (o: { id: string }) => o.id === eventId
  );
  const prev = currentIdx > 0 ? active[currentIdx - 1] : null;
  const next =
    currentIdx < active.length - 1 ? active[currentIdx + 1] : null;

  const totalActive = active.length;
  const positionInSeries = currentIdx + 1;

  return (
    <section className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <div>
        {prev ? (
          <Link
            href={`/events/${prev.id}`}
            className="text-sm text-primary hover:underline"
          >
            &larr; Previous
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">&larr; Previous</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {positionInSeries} of {totalActive} occurrences
      </span>
      <div>
        {next ? (
          <Link
            href={`/events/${next.id}`}
            className="text-sm text-primary hover:underline"
          >
            Next &rarr;
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Next &rarr;</span>
        )}
      </div>
    </section>
  );
}
