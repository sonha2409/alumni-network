/**
 * Resolve a company name to a domain for logo lookup.
 * Resolution chain: company_website → static map → guess (name + .com).
 */

const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Big tech
  'google': 'google.com',
  'alphabet': 'google.com',
  'meta': 'meta.com',
  'facebook': 'meta.com',
  'apple': 'apple.com',
  'amazon': 'amazon.com',
  'aws': 'amazon.com',
  'microsoft': 'microsoft.com',
  'netflix': 'netflix.com',
  'nvidia': 'nvidia.com',
  'tesla': 'tesla.com',
  'spacex': 'spacex.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'deepmind': 'deepmind.com',
  'ibm': 'ibm.com',
  'oracle': 'oracle.com',
  'salesforce': 'salesforce.com',
  'adobe': 'adobe.com',
  'intel': 'intel.com',
  'amd': 'amd.com',
  'qualcomm': 'qualcomm.com',
  'samsung': 'samsung.com',
  'sony': 'sony.com',
  'toshiba': 'toshiba.com',
  'panasonic': 'panasonic.com',
  'lg': 'lg.com',
  'huawei': 'huawei.com',
  'xiaomi': 'xiaomi.com',
  'bytedance': 'bytedance.com',
  'tiktok': 'tiktok.com',
  'tencent': 'tencent.com',
  'alibaba': 'alibaba.com',
  'baidu': 'baidu.com',
  // Software / SaaS
  'stripe': 'stripe.com',
  'shopify': 'shopify.com',
  'spotify': 'spotify.com',
  'slack': 'slack.com',
  'zoom': 'zoom.us',
  'dropbox': 'dropbox.com',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'atlassian': 'atlassian.com',
  'jira': 'atlassian.com',
  'confluence': 'atlassian.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'canva': 'canva.com',
  'vercel': 'vercel.com',
  'supabase': 'supabase.com',
  'datadog': 'datadoghq.com',
  'twilio': 'twilio.com',
  'cloudflare': 'cloudflare.com',
  'palantir': 'palantir.com',
  'snowflake': 'snowflake.com',
  'databricks': 'databricks.com',
  'elastic': 'elastic.co',
  'mongodb': 'mongodb.com',
  'redis': 'redis.com',
  'hashicorp': 'hashicorp.com',
  'docker': 'docker.com',
  'uber': 'uber.com',
  'lyft': 'lyft.com',
  'airbnb': 'airbnb.com',
  'doordash': 'doordash.com',
  'instacart': 'instacart.com',
  'pinterest': 'pinterest.com',
  'snap': 'snap.com',
  'snapchat': 'snap.com',
  'twitter': 'x.com',
  'x': 'x.com',
  'linkedin': 'linkedin.com',
  'reddit': 'reddit.com',
  'discord': 'discord.com',
  // Consulting / Finance
  'mckinsey': 'mckinsey.com',
  'bcg': 'bcg.com',
  'bain': 'bain.com',
  'deloitte': 'deloitte.com',
  'pwc': 'pwc.com',
  'pricewaterhousecoopers': 'pwc.com',
  'ey': 'ey.com',
  'ernst & young': 'ey.com',
  'kpmg': 'kpmg.com',
  'accenture': 'accenture.com',
  'goldman sachs': 'goldmansachs.com',
  'jp morgan': 'jpmorgan.com',
  'jpmorgan': 'jpmorgan.com',
  'morgan stanley': 'morganstanley.com',
  'citibank': 'citigroup.com',
  'citi': 'citigroup.com',
  'hsbc': 'hsbc.com',
  'barclays': 'barclays.com',
  'visa': 'visa.com',
  'mastercard': 'mastercard.com',
  'paypal': 'paypal.com',
  // Vietnam-focused
  'vingroup': 'vingroup.net',
  'vinai': 'vinai.io',
  'vng': 'vng.com.vn',
  'fpt': 'fpt.com.vn',
  'fpt software': 'fpt.com.vn',
  'momo': 'momo.vn',
  'tiki': 'tiki.vn',
  'shopee': 'shopee.com',
  'lazada': 'lazada.com',
  'grab': 'grab.com',
  'gojek': 'gojek.com',
  'cinnamon ai': 'cinnamon.is',
  'cinnamon': 'cinnamon.is',
  'axon': 'axon.com',
  'be group': 'be.com.vn',
  'zalo': 'zalo.me',
  'vnpay': 'vnpay.vn',
  'viettel': 'viettel.com.vn',
  'mobifone': 'mobifone.vn',
  'vinaphone': 'vinaphone.com.vn',
  'saigon technology': 'saigontechnology.com',
  'nashtech': 'nashtechglobal.com',
  'kms technology': 'kms-technology.com',
  // Other
  'boeing': 'boeing.com',
  'lockheed martin': 'lockheedmartin.com',
  'general electric': 'ge.com',
  'ge': 'ge.com',
  'siemens': 'siemens.com',
  'toyota': 'toyota.com',
  'bmw': 'bmw.com',
  'mercedes-benz': 'mercedes-benz.com',
  'volkswagen': 'volkswagen.com',
  'johnson & johnson': 'jnj.com',
  'pfizer': 'pfizer.com',
  'moderna': 'modernatx.com',
  'procter & gamble': 'pg.com',
  'p&g': 'pg.com',
  'unilever': 'unilever.com',
  'nestle': 'nestle.com',
  'coca-cola': 'coca-cola.com',
  'pepsi': 'pepsico.com',
  'pepsico': 'pepsico.com',
  'nike': 'nike.com',
  'adidas': 'adidas.com',
}

/**
 * Extract domain from a URL string.
 * Handles full URLs ("https://google.com/careers") and bare domains ("google.com").
 */
function extractDomain(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    // If it looks like a URL with protocol, parse it
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.replace(/^www\./, '')
    }
    // If it has a dot, treat as bare domain
    if (trimmed.includes('.')) {
      return new URL(`https://${trimmed}`).hostname.replace(/^www\./, '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Sanitize a company name into a plausible domain guess.
 * "Acme Corp" → "acmecorp", "My Company Inc." → "mycompanyinc"
 */
function sanitizeForDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Resolve a company to a domain for logo lookup.
 * Chain: company_website → static map → guess (name.com).
 * Returns null if no reasonable domain can be determined.
 */
export function companyToDomain(
  companyName: string,
  companyWebsite?: string | null
): string | null {
  // 1. company_website takes priority
  if (companyWebsite) {
    const domain = extractDomain(companyWebsite)
    if (domain) return domain
  }

  // 2. Static map lookup (case-insensitive)
  const normalized = companyName.trim().toLowerCase()
  if (!normalized) return null

  const mapped = COMPANY_DOMAIN_MAP[normalized]
  if (mapped) return mapped

  // 3. Guess: sanitize + .com
  const sanitized = sanitizeForDomain(companyName)
  if (sanitized.length < 2) return null
  return `${sanitized}.com`
}
