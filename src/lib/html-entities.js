/**
 * Decode HTML entities in Mermaid source text.
 * Contentlayer/rehype emits numeric refs like &#x3C; for "<" inside <pre> text.
 */
export function decodeHtmlEntities(text) {
  let value = String(text || "");

  // Up to 3 passes covers double-encoding (&amp;#x3C; → &#x3C; → <).
  for (let i = 0; i < 3; i += 1) {
    const next = value
      .replace(/&nbsp;/gi, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCodePoint(parseInt(dec, 10))
      )
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, "&");

    if (next === value) break;
    value = next;
  }

  return value;
}
