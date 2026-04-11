'use client'

import { useState } from 'react'
import Image from 'next/image'
import { companyToDomain } from '@/lib/company-domain'

interface CompanyLogoProps {
  companyName: string
  companyWebsite?: string | null
  size?: number
}

function StyledInitial({ name, size }: { name: string; size: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function CompanyLogo({ companyName, companyWebsite, size = 20 }: CompanyLogoProps) {
  const domain = companyToDomain(companyName, companyWebsite)
  const [error, setError] = useState(false)

  if (!domain || error) {
    return <StyledInitial name={companyName} size={size} />
  }

  return (
    <Image
      src={`/api/logo/${domain}`}
      alt={`${companyName} logo`}
      width={size}
      height={size}
      className="rounded-sm shrink-0"
      onError={() => setError(true)}
      unoptimized
    />
  )
}
