/**
 * Shared Mermaid helpers for the feed pipeline.
 * Diagrams ship as <pre class="mermaid"> from Contentlayer (pre-mermaid strategy)
 * and are turned into mermaid.ink image URLs for RSS readers.
 */
import { deflate } from "pako";
import { decodeHtmlEntities } from "../html-entities.js";

/** Matches a Contentlayer pre-mermaid diagram block. */
export const MERMAID_PRE_RE =
  /<pre\b[^>]*\bclass=["'][^"']*\bmermaid\b[^"']*["'][^>]*>([\s\S]*?)<\/pre>/gi;

/** Extract and decode Mermaid source from a matched <pre> inner HTML. */
export function extractMermaidSource(innerHtml) {
  return decodeHtmlEntities(innerHtml).trim();
}

/**
 * Encode Mermaid source the same way mermaid.live / mermaid.ink expect:
 * JSON state → pako deflate → base64url.
 */
export function encodeMermaidInk(source) {
  const state = JSON.stringify({
    code: source,
    mermaid: { theme: "default" },
  });
  const compressed = deflate(new TextEncoder().encode(state), { level: 9 });
  const encoded = Buffer.from(compressed)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `https://mermaid.ink/img/pako:${encoded}?type=png&bgColor=!white`;
}

/** Short alt text from diagram labels / first non-comment line. */
export function altFromMermaidSource(source) {
  const labels = [];
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("graph ") || trimmed.startsWith("flowchart ")) {
      continue;
    }
    const bracket = trimmed.match(/\[([^\]]+)\]/);
    if (bracket) {
      labels.push(bracket[1].replace(/<[^>]+>/g, "").trim());
    }
    if (labels.length >= 4) break;
  }
  const unique = [...new Set(labels.filter(Boolean))];
  return unique.length ? `图表：${unique.join(" / ")}` : "图表";
}
