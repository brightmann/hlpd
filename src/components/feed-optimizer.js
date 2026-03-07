import siteMetadata from "../../data/sitemetadata";
import { format } from "date-fns";

/**
 * Get MIME type based on file extension
 */
export function getMimeType(url) {
  if (!url || typeof url !== "string") return "image/png";

  try {
    const urlPath = url.split("?")[0].toLowerCase();

    // Check for known image extensions
    if (urlPath.endsWith(".jpg") || urlPath.endsWith(".jpeg")) return "image/jpeg";
    if (urlPath.endsWith(".png")) return "image/png";
    if (urlPath.endsWith(".gif")) return "image/gif";
    if (urlPath.endsWith(".webp")) return "image/webp";
    if (urlPath.endsWith(".svg")) return "image/svg+xml";
    if (urlPath.endsWith(".ico")) return "image/x-icon";
    if (urlPath.endsWith(".bmp")) return "image/bmp";

    // For dynamic image URLs (like /og?title=...), default to PNG
    // Most OG image generators produce PNG
    return "image/png";
  } catch {
    return "image/png";
  }
}

/**
 * Convert relative URLs to absolute URLs in HTML content
 * @param {string} htmlContent - The HTML content to process
 * @param {string} [postSlug] - Optional post slug for converting anchor links
 */
export function convertToAbsoluteUrls(htmlContent, postSlug = "") {
  if (!htmlContent) return htmlContent;

  // Convert relative anchor links (like #user-content-fn-1) to absolute URLs
  // These are typically footnote references that need to point to the original post
  if (postSlug) {
    htmlContent = htmlContent.replace(
      /href=["']#([^"']+)["']/gi,
      (match, anchor) => {
        return `href="${siteMetadata.siteUrl}${postSlug}#${anchor}"`;
      }
    );
  }

  // Convert relative URLs in href attributes
  htmlContent = htmlContent.replace(
    /href=["'](?!["']*(?:https?:|mailto:|#|tel:))([^"']+)["']/gi,
    (match, path) => {
      const absoluteUrl = path.startsWith("/")
        ? `${siteMetadata.siteUrl}${path}`
        : `${siteMetadata.siteUrl}/${path}`;
      return `href="${absoluteUrl}"`;
    }
  );

  // Convert relative URLs in src attributes
  htmlContent = htmlContent.replace(
    /src=["'](?!["']*(?:https?:|data:))([^"']+)["']/gi,
    (match, path) => {
      const absoluteUrl = path.startsWith("/")
        ? `${siteMetadata.siteUrl}${path}`
        : `${siteMetadata.siteUrl}/${path}`;
      return `src="${absoluteUrl}"`;
    }
  );

  return htmlContent;
}

/**
 * Fix HTML issues for RSS feed validity
 */
export function sanitizeHtmlForFeed(htmlContent) {
  if (!htmlContent) return htmlContent;

  // 1. Fix self-closing br tags (HTML5 compatible)
  htmlContent = htmlContent.replace(/<br\s*\/>/gi, "<br>");

  // 2. Remove invalid closing br tags (</br> is not valid HTML)
  htmlContent = htmlContent.replace(/<\/br>/gi, "");

  // 3. Fix self-closing hr tags
  htmlContent = htmlContent.replace(/<hr\s*\/>/gi, "<hr>");

  // 4. Handle KaTeX math elements - remove math tags but keep content
  // The RSS validator doesn't recognize MathML, so we strip the tags
  // Remove <math> opening tags with any attributes
  htmlContent = htmlContent.replace(/<math[^>]*>/gi, "");
  // Remove </math> closing tags
  htmlContent = htmlContent.replace(/<\/math>/gi, "");

  // Remove other MathML tags that might appear
  htmlContent = htmlContent.replace(/<\/?(mrow|mi|mo|mn|msup|msub|mfrac|munder|mover|munderover|mspace|mtext|semantics|mstyle|annotation|annotation-encoding|mfrac|mtable|mtr|mtd|maction|mglyph|mlabeledtr|mmultiscripts|none|mprescripts|mscarries|mscarry|msgroup|msline|mspace|mstack|msrow|merror|mpadded|mphantom|mroot|msqrt|mstyle|msubsup|mtoken|menclose)[^>]*>/gi, "");

  // 5. Remove potentially dangerous style attributes from KaTeX spans
  // These cause "potentially dangerous content" warnings in feed validators
  // Remove style attributes containing vertical-align from ANY element
  htmlContent = htmlContent.replace(
    /(<\w+[^>]*?)\s+style=["'][^"']*vertical-align[^"']*["']([^>]*>)/gi,
    "$1$2"
  );

  // Remove style attributes containing height from ANY element (except svg/style tags)
  htmlContent = htmlContent.replace(
    /(<(?!svg|style)\w+[^>]*?)\s+style=["'][^"']*height[^"']*["']([^>]*>)/gi,
    "$1$2"
  );

  // Remove empty strut spans that KaTeX generates (they're just spacing elements)
  htmlContent = htmlContent.replace(/<span class="strut"[^>]*><\/span>/gi, "");
  htmlContent = htmlContent.replace(/<span class="pstrut"[^>]*><\/span>/gi, "");

  // Clean up any remaining empty style attributes
  htmlContent = htmlContent.replace(/\s+style=["']["']/gi, "");

  // Clean up multiple spaces that might result from attribute removal
  htmlContent = htmlContent.replace(/\s{2,}/g, " ");

  // Clean up spaces before >
  htmlContent = htmlContent.replace(/\s+>/g, ">");

  return htmlContent;
}

export function optimizeImagesForFeed(htmlContent) {
  if (!htmlContent) return htmlContent;

  const imgRegex = /<img\s+([^>]*?)>/gi;

  return htmlContent.replace(imgRegex, (match, attributes) => {
    const srcMatch = attributes.match(/src=["']([^"']*?)["']/i);

    if (!srcMatch) return match;

    const originalSrc = srcMatch[1];

    let optimizedSrc = originalSrc;
    if (originalSrc.startsWith("/")) {
      const encodedUrl = encodeURIComponent(originalSrc);
      optimizedSrc = `${siteMetadata.siteUrl}/_next/image?url=${encodedUrl}&w=1920&q=75`;
    } else if (originalSrc.startsWith("./") || !originalSrc.includes("://")) {
      const absolutePath = originalSrc.startsWith("./")
        ? originalSrc.slice(2)
        : originalSrc;
      const encodedUrl = encodeURIComponent(`/${absolutePath}`);
      optimizedSrc = `${siteMetadata.siteUrl}/_next/image?url=${encodedUrl}&w=1920&q=75`;
    }

    const newAttributes = attributes.replace(
      /src=["']([^"']*?)["']/i,
      `src="${optimizedSrc}"`
    );

    return `<img ${newAttributes}>`;
  });
}

export function enhanceFeedContent(post) {
  let optimizedHtml = optimizeImagesForFeed(post.body.html);
  optimizedHtml = convertToAbsoluteUrls(optimizedHtml, post.slug);
  optimizedHtml = sanitizeHtmlForFeed(optimizedHtml);

  return `<p>${post.description}</p><hr>${optimizedHtml}<hr><a href="${siteMetadata.siteUrl}">${siteMetadata.title}</a><p>${siteMetadata.description}</p><p>作者${siteMetadata.author}</p><p>${format(new Date(post.publishDate), "yyyy MMMM do")}发布</p>`;
}
