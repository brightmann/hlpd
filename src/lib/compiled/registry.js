import Mdx_about from './about.jsx'

const registry = {
  "about": Mdx_about,
}

export function getMdxPageComponent(slugAsParams) {
  return registry[slugAsParams] ?? null
}
