import Link from "next/link";

interface Props {
  success: boolean;
  error?: string;
  alreadyCheckedIn: boolean;
  eventTitle: string;
  eventId: string;
}

export function CheckinResult({
  success,
  error,
  alreadyCheckedIn,
  eventTitle,
  eventId,
}: Props) {
  if (!success) {
    return (
      <>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Check-in failed</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link
          href={`/events/${eventId}`}
          className="mt-2 text-sm text-primary underline underline-offset-4"
        >
          Go to event
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-8 w-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold">
        {alreadyCheckedIn ? "Already checked in" : "You're checked in!"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {alreadyCheckedIn
          ? `You were already checked in to ${eventTitle}.`
          : `Welcome to ${eventTitle}!`}
      </p>
      <Link
        href={`/events/${eventId}`}
        className="mt-2 text-sm text-primary underline underline-offset-4"
      >
        View event details
      </Link>
    </>
  );
}
