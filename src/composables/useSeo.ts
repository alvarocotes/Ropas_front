import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  applyDocumentSeo,
  breadcrumbJsonLd,
  organizationJsonLd,
  seoFromRoute,
  websiteJsonLd,
  webPageJsonLd,
  type SeoConfig,
} from '@/seo'

export function applySeoForPath(meta: { requiresAuth?: boolean; seo?: SeoConfig }, path: string) {
  applyDocumentSeo(seoFromRoute(meta, path), path)
}

export function usePublicJsonLd() {
  const route = useRoute()
  return computed(() => {
    const seo = seoFromRoute(route.meta, route.path)
    const graph: unknown[] = [organizationJsonLd(), websiteJsonLd(), webPageJsonLd(seo, route.path)]
    if (route.name && route.name !== 'home' && seo.breadcrumbName) {
      graph.push(
        breadcrumbJsonLd([
          { name: 'Inicio', path: '/' },
          { name: seo.breadcrumbName, path: route.path },
        ]),
      )
    }
    return {
      '@context': 'https://schema.org',
      '@graph': graph,
    }
  })
}
