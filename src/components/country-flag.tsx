import { countryToFlag } from '@/lib/country-flags'

interface CountryFlagProps {
  country: string | null
  className?: string
}

export function CountryFlag({ country, className }: CountryFlagProps) {
  const flag = countryToFlag(country)
  if (!flag) return null

  return (
    <span aria-label={`${country} flag`} className={className}>
      {flag}
    </span>
  )
}
