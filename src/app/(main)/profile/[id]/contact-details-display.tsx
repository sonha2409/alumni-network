import type { ProfileContactDetails } from "@/lib/types";

interface ContactDetailsDisplayProps {
  contactDetails: ProfileContactDetails;
}

export function ContactDetailsDisplay({ contactDetails }: ContactDetailsDisplayProps) {
  const items: { label: string; value: string; href?: string }[] = [];

  if (contactDetails.personal_email) {
    items.push({
      label: "Email",
      value: contactDetails.personal_email,
      href: `mailto:${contactDetails.personal_email}`,
    });
  }
  if (contactDetails.phone) {
    items.push({
      label: "Phone",
      value: contactDetails.phone,
      href: `tel:${contactDetails.phone}`,
    });
  }
  if (contactDetails.linkedin_url) {
    items.push({
      label: "LinkedIn",
      value: contactDetails.linkedin_url,
      href: contactDetails.linkedin_url,
    });
  }
  if (contactDetails.github_url) {
    items.push({
      label: "GitHub",
      value: contactDetails.github_url,
      href: contactDetails.github_url,
    });
  }
  if (contactDetails.website_url) {
    items.push({
      label: "Website",
      value: contactDetails.website_url,
      href: contactDetails.website_url,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2 text-sm">
          <span className="font-medium text-muted-foreground min-w-[70px]">
            {item.label}
          </span>
          {item.href ? (
            <a
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-primary underline underline-offset-4 break-all"
            >
              {item.value}
            </a>
          ) : (
            <span className="break-all">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
