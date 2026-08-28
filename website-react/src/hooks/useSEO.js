import { useEffect } from 'react'

const SITE_URL = 'https://zenithapp.org'

function setMetaTag(attribute, key, content) {
  let tag = document.querySelector(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonicalLink(path) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', `${SITE_URL}${path}`)
}

// Sets the page title, meta description, canonical URL and robots directive
// for the current route. React Router is a single-page app, so every route
// shares one index.html — without this, every page would report the same
// title and description to search engines.
export function useSEO({ title, description, path, noindex = false }) {
  useEffect(() => {
    document.title = title

    if (description) setMetaTag('name', 'description', description)

    setCanonicalLink(path)

    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  }, [title, description, path, noindex])
}
