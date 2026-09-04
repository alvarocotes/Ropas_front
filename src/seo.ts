export const SITE_URL = 'https://ropas-front.vercel.app'
export const SITE_NAME = 'Entretejidos'
export const SITE_ALTERNATE = 'Comité de Abrigo'
export const OG_IMAGE = `${SITE_URL}/ENTRETEGIDO.png`

export const HOME_TITLE = 'Donar ropa en Pereira | Entretejidos – Comité de Abrigo'
export const HOME_DESCRIPTION =
  'Dona ropa en Pereira con Entretejidos, Comité de Abrigo. Registra donaciones, consulta qué se necesita, solicita ayuda o participa como voluntario. Dona con amor, abriga con esperanza.'

export type SeoConfig = {
  title: string
  description: string
  robots?: string
  breadcrumbName?: string
}

export function canonicalUrl(path: string) {
  const clean = path.split('?')[0]?.split('#')[0] ?? '/'
  if (clean === '/' || clean === '') return `${SITE_URL}/`
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`.replace(/\/+$/, '')
}

export function upsertMeta(kind: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${kind}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(kind, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function applyDocumentSeo(config: SeoConfig, path: string) {
  const url = canonicalUrl(path)
  const robots = config.robots ?? 'index, follow'
  document.title = config.title
  upsertMeta('name', 'description', config.description)
  upsertMeta('name', 'robots', robots)
  upsertLink('canonical', url)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:locale', 'es_CO')
  upsertMeta('property', 'og:site_name', `${SITE_NAME} – ${SITE_ALTERNATE}`)
  upsertMeta('property', 'og:title', config.title)
  upsertMeta('property', 'og:description', config.description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:image', OG_IMAGE)
  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', config.title)
  upsertMeta('name', 'twitter:description', config.description)
  upsertMeta('name', 'twitter:image', OG_IMAGE)
}

const PRIVATE_SEO: SeoConfig = {
  title: `${SITE_NAME} – ${SITE_ALTERNATE}`,
  description: HOME_DESCRIPTION,
  robots: 'noindex, nofollow',
}

export function seoFromRoute(meta: { requiresAuth?: boolean; seo?: SeoConfig }, path: string) {
  if (meta.seo) return meta.seo
  if (meta.requiresAuth) return PRIVATE_SEO
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    robots: 'index, follow',
  }
}

export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE,
    url: `${SITE_URL}/`,
    logo: OG_IMAGE,
    description: HOME_DESCRIPTION,
    areaServed: {
      '@type': 'City',
      name: 'Pereira',
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: 'Risaralda',
        containedInPlace: {
          '@type': 'Country',
          name: 'Colombia',
        },
      },
    },
  }
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    name: `${SITE_NAME} – ${SITE_ALTERNATE}`,
    url: `${SITE_URL}/`,
    inLanguage: 'es-CO',
    description: HOME_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE,
    },
  }
}

export function webPageJsonLd(config: SeoConfig, path: string) {
  return {
    '@type': 'WebPage',
    name: config.title,
    description: config.description,
    url: canonicalUrl(path),
    inLanguage: 'es-CO',
    isPartOf: {
      '@type': 'WebSite',
      url: `${SITE_URL}/`,
      name: `${SITE_NAME} – ${SITE_ALTERNATE}`,
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  }
}
