// Precompiles data/content/pages/*.md (MDX) to static React components.
//
// Replaces next-contentlayer2's useMDXComponent (which evaluates compiled MDX
// with new Function(), forbidden on Cloudflare Workers) with plain importable
// modules. Only the about page uses MDX; blog posts are pre-rendered to HTML
// by scripts/build-content.mjs.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { compile } from '@mdx-js/mdx'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const matter = require('gray-matter')

const root = new URL('../', import.meta.url).pathname
const pagesDir = join(root, 'data', 'content', 'pages')
const outDir = join(root, 'src', 'lib', 'compiled')

const files = (await readdir(pagesDir)).filter((f) => f.endsWith('.md'))
await mkdir(outDir, { recursive: true })

const entries = []
for (const file of files) {
  const name = file.replace(/\.md$/, '')
  // contentlayer's slugAsParams for pages strips the leading "pages/" segment
  const slugAsParams = name.toLowerCase()
  const raw = await readFile(join(pagesDir, file), 'utf8')
  const { content: body } = matter(raw)
  const { value } = await compile(body, {
    outputFormat: 'program',
  })
  const outName = `${slugAsParams}.jsx`
  await writeFile(join(outDir, outName), String(value))
  const varName = `Mdx_${slugAsParams.replace(/[^a-zA-Z0-9_$]/g, '_')}`
  entries.push({ slugAsParams, varName, outName })
  console.log(`compiled pages/${file} -> src/lib/compiled/${outName}`)
}

const registry =
  entries.map(({ varName, outName }) => `import ${varName} from './${outName}'`).join('\n') +
  `\n\nconst registry = {\n` +
  entries.map(({ slugAsParams, varName }) => `  ${JSON.stringify(slugAsParams)}: ${varName},`).join('\n') +
  `\n}\n\nexport function getMdxPageComponent(slugAsParams) {\n  return registry[slugAsParams] ?? null\n}\n`

await writeFile(join(outDir, 'registry.js'), registry)
console.log(`wrote registry with ${entries.length} components`)
