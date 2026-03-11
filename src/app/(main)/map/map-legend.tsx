"use client";

interface MapLegendProps {
  buckets: number[];
  colors: string[];
}

export function MapLegend({ buckets, colors }: MapLegendProps) {
  return (
    <div className="absolute bottom-6 left-4 z-10 rounded-lg border border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Alumni count
      </p>
      <div className="flex flex-col gap-1">
        {colors.map((color, i) => {
          const min = i === 0 ? 1 : buckets[i - 1] + 1;
          const max = buckets[i];
          const label = min === max ? `${min}` : `${min}–${max}`;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
