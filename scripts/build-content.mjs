// Generates src/lib/generated-content.js from data/content/** and data/*.yaml.
//
// Replaces contentlayer2 (whose generated modules read from .contentlayer at
// build time and whose useMDXComponent evals via new Function(), forbidden on
// Cloudflare Workers). Markdown bodies are rendered to HTML here at build
// time, mirroring the remark/rehype pipeline in contentlayer.config.js, so no
// filesystem reads happen at request time.
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkGemoji from 'remark-gemoji'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import rehypeShiki from '@shikijs/rehype'
import readingTime from 'reading-time'
import rehypeFigure from '../src/components/rehype-figure.js'
import rehypeMermaidPre from '../src/components/rehype-mermaid-pre.js'

const require = createRequire(import.meta.url)
const matter = require('gray-matter')
const yaml = require('js-yaml')

const root = new URL('../', import.meta.url).pathname
const blogDir = join(root, 'data', 'content', 'blog')
const pagesDir = join(root, 'data', 'content', 'pages')

// Markdown -> HTML pipeline mirroring contentlayer.config.js.
// Note: rehypeShiki must run before rehypeStringify (the config lists them in
// the opposite order, which would be a no-op for highlighting).
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkGemoji)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex, { strict: false, trust: true, output: 'htmlAndMathml' })
  .use(rehypeSlug)
  .use(rehypeFigure)
  .use(rehypeMermaidPre)
  .use(rehypeShiki, {
    themes: {
      light: 'material-theme-lighter',
      dark: 'material-theme-darker',
    },
  })
  .use(rehypeStringify, { allowDangerousHtml: true })

async function renderHtml(markdown) {
  const file = await processor.process(markdown)
  return String(file)
}

function computeHeadings(raw) {
  const regXHeader = /\n(?<flag>#{2,6})\s+(?<content>.+)/g
  return Array.from(raw.matchAll(regXHeader)).map(({ groups }) => {
    const flag = groups?.flag
    const content = groups?.content
    return {
      level: flag?.length == 1 ? 'one' : flag?.length == 2 ? 'two' : 'three',
      text: content,
      id: content.split(' ').join('-').toLowerCase(),
    }
  })
}

function toISODate(value) {
  if (!value) return value
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? value : d.toISOString()
}

// ---- Blog posts ----
const blogFiles = (await readdir(blogDir)).filter((f) => f.endsWith('.md'))
const allPosts = []
for (const file of blogFiles) {
  const raw = await readFile(join(blogDir, file), 'utf8')
  const { data, content } = matter(raw)
  if (!data.title || !data.publishDate) {
    throw new Error(`${file}: missing required frontmatter (title/publishDate)`)
  }
  const name = file.replace(/\.md$/, '')
  const flattenedPath = `blog/${name}`
  const html = await renderHtml(content)
  allPosts.push({
    title: data.title,
    description: data.description ?? '',
    publishDate: toISODate(data.publishDate),
    ...(data.lastmod ? { lastmod: toISODate(data.lastmod) } : {}),
    image: data.image ?? '',
    draft: data.draft ?? false,
    featured: data.featured ?? false,
    categories: data.categories ?? [],
    tags: data.tags ?? [],
    imageDesc: data.imageDesc ?? '',
    urlslug: `/${flattenedPath}`,
    slug: `/${flattenedPath}`.toLowerCase(),
    slugAsParams: flattenedPath.split('/').slice(1).join('/').toLowerCase(),
    readingTime: readingTime(content, { wordsPerMinute: 1000 }),
    headings: computeHeadings(content),
    body: { raw: content, html },
  })
  console.log(`post ${file} -> html (${html.length} chars)`)
}

// Newest first (matches previous contentlayer-driven sort usage).
allPosts.sort((a, b) => (new Date(a.publishDate) > new Date(b.publishDate) ? -1 : 1))

// ---- Static pages (metadata only; MDX bodies precompiled by compile-mdx.mjs) ----
const pageFiles = (await readdir(pagesDir)).filter((f) => f.endsWith('.md'))
const allPages = []
for (const file of pageFiles) {
  const raw = await readFile(join(pagesDir, file), 'utf8')
  const { data, content } = matter(raw)
  if (!data.title) {
    throw new Error(`pages/${file}: missing required frontmatter (title)`)
  }
  const name = file.replace(/\.md$/, '')
  const flattenedPath = `pages/${name}`
  allPages.push({
    title: data.title,
    description: data.description ?? '',
    urlslug: `/${flattenedPath}`,
    slug: `/${flattenedPath}`.toLowerCase(),
    // contentlayer's slugAsParams strips the first path segment ("pages")
    slugAsParams: flattenedPath.split('/').slice(1).join('/').toLowerCase(),
    readingTime: readingTime(content, { wordsPerMinute: 1000 }),
    headings: computeHeadings(content),
    body: { raw: content },
  })
  console.log(`page ${file} -> metadata`)
}

// ---- Microblog + friend links (previously fs.readFileSync at request time) ----
const microblogs = yaml.load(await readFile(join(root, 'data', 'microblog.yaml'), 'utf8'))
const friendLinks = yaml.load(await readFile(join(root, 'data', 'links.yaml'), 'utf8'))
console.log(`microblogs: ${microblogs.length}, friend links: ${friendLinks.length}`)

// ---- Cover image sizes (previously statSync at request time in feed builder) ----
const coverSizes = {}
for (const post of allPosts) {
  const image = String(post.image || '').trim()
  if (!image.startsWith('/')) continue
  try {
    const { size } = await stat(join(root, 'public', image))
    if (size) coverSizes[image] = size
  } catch {
    // missing file -> no enclosure, same as before
  }
}
console.log(`cover sizes: ${Object.keys(coverSizes).length}`)

const out = `// GENERATED by scripts/build-content.mjs — do not edit.
export const allPosts = ${JSON.stringify(allPosts, null, 2)}

export const allPages = ${JSON.stringify(allPages, null, 2)}

export const microblogs = ${JSON.stringify(microblogs, null, 2)}

export const friendLinks = ${JSON.stringify(friendLinks, null, 2)}

export const coverSizes = ${JSON.stringify(coverSizes, null, 2)}
`

await writeFile(join(root, 'src', 'lib', 'generated-content.js'), out)
console.log(`wrote src/lib/generated-content.js (${allPosts.length} posts, ${allPages.length} pages)`)
