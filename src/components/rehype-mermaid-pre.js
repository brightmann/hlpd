/**
 * Lightweight rehype plugin: turn mermaid code blocks into
 * <pre class="mermaid">…</pre> for client-side rendering.
 * No Playwright / mermaid-isomorphic dependency.
 */
import { visit } from "unist-util-visit";

function isMermaidCode(node) {
  const className = node.properties?.className;
  if (!className) return false;
  const classes = Array.isArray(className) ? className : [className];
  return classes.some(
    (c) => c === "language-mermaid" || c === "mermaid" || String(c).includes("mermaid")
  );
}

function codeText(node) {
  return (node.children || [])
    .filter((child) => child.type === "text")
    .map((child) => child.value)
    .join("");
}

export default function rehypeMermaidPre() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;

      // <pre><code class="language-mermaid">…</code></pre>
      if (node.tagName === "pre") {
        const code = (node.children || []).find(
          (child) => child.type === "element" && child.tagName === "code"
        );
        if (code && isMermaidCode(code)) {
          parent.children[index] = {
            type: "element",
            tagName: "pre",
            properties: { className: ["mermaid"] },
            children: [{ type: "text", value: codeText(code) }],
          };
        }
        return;
      }

      // Bare <code class="language-mermaid">…</code>
      if (node.tagName === "code" && isMermaidCode(node)) {
        parent.children[index] = {
          type: "element",
          tagName: "pre",
          properties: { className: ["mermaid"] },
          children: [{ type: "text", value: codeText(node) }],
        };
      }
    });
  };
}
