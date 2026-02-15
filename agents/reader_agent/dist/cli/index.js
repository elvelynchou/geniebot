#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/cli/index.ts
import { Command } from "commander";

// src/client.ts
import HeroCore from "@ulixee/hero-core";
import { TransportBridge } from "@ulixee/net";
import { ConnectionToHeroCore } from "@ulixee/hero";

// src/scraper.ts
import pLimit from "p-limit";

// src/formatters/markdown.ts
import { convert } from "@vakra-dev/supermarkdown";
function htmlToMarkdown(html) {
  try {
    return convert(html, {
      headingStyle: "atx",
      bulletMarker: "-",
      codeFence: "`",
      linkStyle: "inline"
    });
  } catch (error) {
    console.warn("Error converting HTML to Markdown:", error);
    return html.replace(/<[^>]*>/g, "").trim();
  }
}

// src/utils/content-cleaner.ts
import { parseHTML } from "linkedom";
var ALWAYS_REMOVE_SELECTORS = [
  // Scripts and styles
  "script",
  "style",
  "noscript",
  "link[rel='stylesheet']",
  // Hidden elements
  "[hidden]",
  "[aria-hidden='true']",
  "[style*='display: none']",
  "[style*='display:none']",
  "[style*='visibility: hidden']",
  "[style*='visibility:hidden']",
  // SVG icons and decorative elements
  "svg[aria-hidden='true']",
  "svg.icon",
  "svg[class*='icon']",
  // Template and metadata
  "template",
  "meta",
  // Embeds that don't convert to text
  "iframe",
  "canvas",
  "object",
  "embed",
  // Forms (usually not main content)
  "form",
  "input",
  "select",
  "textarea",
  "button"
];
var OVERLAY_SELECTORS = [
  "[class*='modal']",
  "[class*='popup']",
  "[class*='overlay']",
  "[class*='dialog']",
  "[role='dialog']",
  "[role='alertdialog']",
  "[class*='cookie']",
  "[class*='consent']",
  "[class*='gdpr']",
  "[class*='privacy-banner']",
  "[class*='notification-bar']",
  "[id*='cookie']",
  "[id*='consent']",
  "[id*='gdpr']",
  // Fixed/sticky positioned elements
  "[style*='position: fixed']",
  "[style*='position:fixed']",
  "[style*='position: sticky']",
  "[style*='position:sticky']"
];
var NAVIGATION_SELECTORS = [
  // Semantic elements
  "header",
  "footer",
  "nav",
  "aside",
  // Header variations
  ".header",
  ".top",
  ".navbar",
  "#header",
  // Footer variations
  ".footer",
  ".bottom",
  "#footer",
  // Sidebars
  ".sidebar",
  ".side",
  ".aside",
  "#sidebar",
  // Modals/popups (backup if not caught by OVERLAY_SELECTORS)
  ".modal",
  ".popup",
  "#modal",
  ".overlay",
  // Ads
  ".ad",
  ".ads",
  ".advert",
  "#ad",
  // Language selectors
  ".lang-selector",
  ".language",
  "#language-selector",
  // Social
  ".social",
  ".social-media",
  ".social-links",
  "#social",
  // Navigation/menus
  ".menu",
  ".navigation",
  "#nav",
  // Breadcrumbs
  ".breadcrumbs",
  "#breadcrumbs",
  // Share buttons
  ".share",
  "#share",
  // Widgets
  ".widget",
  "#widget",
  // Cookie notices (backup)
  ".cookie",
  "#cookie"
];
var FORCE_INCLUDE_SELECTORS = [
  // IDs
  "#main",
  "#content",
  "#main-content",
  "#article",
  "#post",
  "#page-content",
  // Semantic elements
  "main",
  "article",
  "[role='main']",
  // Classes
  ".main-content",
  ".content",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".page-content",
  ".article-body",
  ".post-body",
  ".story-content",
  ".blog-content"
];
var AD_SELECTORS = [
  // Google ads
  "ins.adsbygoogle",
  ".google-ad",
  ".adsense",
  // Generic ad containers
  "[data-ad]",
  "[data-ads]",
  "[data-ad-slot]",
  "[data-ad-client]",
  // Common ad class patterns
  ".ad-container",
  ".ad-wrapper",
  ".advertisement",
  ".sponsored-content",
  // Tracking pixels
  "img[width='1'][height='1']",
  "img[src*='pixel']",
  "img[src*='tracking']",
  "img[src*='analytics']"
];
function getLinkDensity(element) {
  const text = element.textContent || "";
  const textLength = text.trim().length;
  if (textLength === 0) return 1;
  let linkLength = 0;
  element.querySelectorAll("a").forEach((link) => {
    linkLength += (link.textContent || "").trim().length;
  });
  return linkLength / textLength;
}
function getContentScore(element) {
  let score = 0;
  const text = element.textContent || "";
  const textLength = text.trim().length;
  score += Math.min(textLength / 100, 50);
  score += element.querySelectorAll("p").length * 3;
  score += element.querySelectorAll("h1, h2, h3, h4, h5, h6").length * 2;
  score += element.querySelectorAll("img").length * 1;
  score -= element.querySelectorAll("a").length * 0.5;
  score -= element.querySelectorAll("li").length * 0.2;
  const linkDensity = getLinkDensity(element);
  if (linkDensity > 0.5) score -= 30;
  else if (linkDensity > 0.3) score -= 15;
  const classAndId = (element.className || "") + " " + (element.id || "");
  if (/article|content|post|body|main|entry/i.test(classAndId)) score += 25;
  if (/comment|sidebar|footer|nav|menu|header|widget|ad/i.test(classAndId)) score -= 25;
  return score;
}
function looksLikeNavigation(element) {
  const linkDensity = getLinkDensity(element);
  if (linkDensity > 0.5) return true;
  const listItems = element.querySelectorAll("li");
  const links = element.querySelectorAll("a");
  if (listItems.length > 5 && links.length > listItems.length * 0.8) return true;
  return false;
}
function removeElements(document, selectors) {
  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
    }
  }
}
function removeWithProtection(document, selectorsToRemove, protectedSelectors) {
  for (const selector of selectorsToRemove) {
    try {
      document.querySelectorAll(selector).forEach((element) => {
        const isProtected = protectedSelectors.some((ps) => {
          try {
            return element.matches(ps);
          } catch {
            return false;
          }
        });
        if (isProtected) return;
        const containsProtected = protectedSelectors.some((ps) => {
          try {
            return element.querySelector(ps) !== null;
          } catch {
            return false;
          }
        });
        if (containsProtected) return;
        element.remove();
      });
    } catch {
    }
  }
}
function findMainContent(document) {
  const isValidContent = (el) => {
    if (!el) return false;
    const text = el.textContent || "";
    if (text.trim().length < 100) return false;
    if (looksLikeNavigation(el)) return false;
    return true;
  };
  const main = document.querySelector("main");
  if (isValidContent(main) && getLinkDensity(main) < 0.4) {
    return main;
  }
  const roleMain = document.querySelector('[role="main"]');
  if (isValidContent(roleMain) && getLinkDensity(roleMain) < 0.4) {
    return roleMain;
  }
  const articles = document.querySelectorAll("article");
  if (articles.length === 1 && isValidContent(articles[0])) {
    return articles[0];
  }
  const contentSelectors = [
    "#content",
    "#main-content",
    "#main",
    ".content",
    ".main-content",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".page-content",
    ".article-body",
    ".post-body",
    ".story-content",
    ".blog-content"
  ];
  for (const selector of contentSelectors) {
    try {
      const el = document.querySelector(selector);
      if (isValidContent(el) && getLinkDensity(el) < 0.4) {
        return el;
      }
    } catch {
    }
  }
  const candidates = [];
  const containers = document.querySelectorAll("div, section, article");
  containers.forEach((el) => {
    const text = el.textContent || "";
    if (text.trim().length < 200) return;
    const score = getContentScore(el);
    if (score > 0) {
      candidates.push({ el, score });
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length > 0 && candidates[0].score > 20) {
    return candidates[0].el;
  }
  return null;
}
function cleanHtml(html, baseUrl, options = {}) {
  const {
    removeAds = true,
    removeBase64Images = true,
    onlyMainContent = true,
    includeTags,
    excludeTags
  } = options;
  const { document } = parseHTML(html);
  removeElements(document, ALWAYS_REMOVE_SELECTORS);
  removeElements(document, OVERLAY_SELECTORS);
  if (removeAds) {
    removeElements(document, AD_SELECTORS);
  }
  if (excludeTags && excludeTags.length > 0) {
    removeElements(document, excludeTags);
  }
  if (onlyMainContent) {
    removeWithProtection(document, NAVIGATION_SELECTORS, FORCE_INCLUDE_SELECTORS);
    const mainContent = findMainContent(document);
    if (mainContent) {
      const body = document.body;
      if (body) {
        const clone = mainContent.cloneNode(true);
        body.innerHTML = "";
        body.appendChild(clone);
      }
    }
  }
  if (includeTags && includeTags.length > 0) {
    const matchedElements = [];
    for (const selector of includeTags) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          matchedElements.push(el.cloneNode(true));
        });
      } catch {
      }
    }
    if (matchedElements.length > 0) {
      const body = document.body;
      if (body) {
        body.innerHTML = "";
        matchedElements.forEach((el) => body.appendChild(el));
      }
    }
  }
  if (removeBase64Images) {
    removeBase64ImagesFromDocument(document);
  }
  const walker = document.createTreeWalker(
    document,
    128
    /* NodeFilter.SHOW_COMMENT */
  );
  const comments = [];
  while (walker.nextNode()) {
    comments.push(walker.currentNode);
  }
  comments.forEach((comment) => comment.parentNode?.removeChild(comment));
  convertRelativeUrls(document, baseUrl);
  return document.documentElement?.outerHTML || html;
}
function removeBase64ImagesFromDocument(document) {
  document.querySelectorAll("img[src^='data:']").forEach((el) => {
    el.remove();
  });
  document.querySelectorAll("[style*='data:image']").forEach((el) => {
    const style = el.getAttribute("style");
    if (style) {
      const cleanedStyle = style.replace(
        /background(-image)?:\s*url\([^)]*data:image[^)]*\)[^;]*;?/gi,
        ""
      );
      if (cleanedStyle.trim()) {
        el.setAttribute("style", cleanedStyle);
      } else {
        el.removeAttribute("style");
      }
    }
  });
  document.querySelectorAll("source[src^='data:'], source[srcset*='data:']").forEach((el) => {
    el.remove();
  });
}
function convertRelativeUrls(document, baseUrl) {
  document.querySelectorAll("[src]").forEach((el) => {
    const src = el.getAttribute("src");
    if (src && !src.startsWith("http") && !src.startsWith("//") && !src.startsWith("data:")) {
      try {
        el.setAttribute("src", new URL(src, baseUrl).toString());
      } catch {
      }
    }
  });
  document.querySelectorAll("[href]").forEach((el) => {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("http") && !href.startsWith("//") && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("javascript:")) {
      try {
        el.setAttribute("href", new URL(href, baseUrl).toString());
      } catch {
      }
    }
  });
}
function cleanContent(html, baseUrl, options = {}) {
  return cleanHtml(html, baseUrl, options);
}

// src/utils/metadata-extractor.ts
import { parseHTML as parseHTML2 } from "linkedom";

// src/utils/url-helpers.ts
import { URL as URL2 } from "url";
import RE2 from "re2";
function resolveUrl(relative, base) {
  try {
    return new URL2(relative, base).toString();
  } catch {
    return relative;
  }
}
function isValidUrl(string) {
  try {
    new URL2(string);
    return true;
  } catch {
    return false;
  }
}
function normalizeUrl(url, baseUrl) {
  try {
    let parsedUrl;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      parsedUrl = new URL2(url);
    } else if (baseUrl) {
      parsedUrl = new URL2(url, baseUrl);
    } else {
      throw new Error("Relative URL requires base URL");
    }
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}
function extractBaseDomain(url) {
  try {
    const parsedUrl = new URL2(url);
    return parsedUrl.hostname;
  } catch {
    throw new Error(`Invalid URL for domain extraction: ${url}`);
  }
}
function getRootDomain(hostname) {
  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return hostname;
  }
  const twoPartTLDs = ["co.uk", "com.au", "co.nz", "com.br", "co.jp", "co.kr", "com.mx", "org.uk"];
  const lastTwo = parts.slice(-2).join(".");
  if (twoPartTLDs.includes(lastTwo)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}
function isSameDomain(url, baseUrl) {
  try {
    const urlDomain = extractBaseDomain(url);
    const baseDomain = extractBaseDomain(baseUrl);
    if (urlDomain === baseDomain) {
      return true;
    }
    const urlRoot = getRootDomain(urlDomain);
    const baseRoot = getRootDomain(baseDomain);
    return urlRoot === baseRoot;
  } catch {
    return false;
  }
}
function getUrlKey(url) {
  try {
    const parsedUrl = new URL2(url);
    parsedUrl.hash = "";
    parsedUrl.search = "";
    if (parsedUrl.hostname.startsWith("www.")) {
      parsedUrl.hostname = parsedUrl.hostname.slice(4);
    }
    if (parsedUrl.protocol === "http:" && parsedUrl.port === "80" || parsedUrl.protocol === "https:" && parsedUrl.port === "443") {
      parsedUrl.port = "";
    }
    const indexFiles = ["index.html", "index.htm", "default.html", "default.htm", "index.php"];
    for (const indexFile of indexFiles) {
      if (parsedUrl.pathname.endsWith(`/${indexFile}`)) {
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -indexFile.length);
        break;
      }
    }
    let normalized = parsedUrl.toString().toLowerCase();
    if (normalized.endsWith("/") && parsedUrl.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}
function matchesPatterns(url, patterns) {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return patterns.some((pattern) => {
    try {
      const regex = new RE2(pattern, "i");
      return regex.test(url);
    } catch {
      return false;
    }
  });
}
function shouldIncludeUrl(url, includePatterns, excludePatterns) {
  if (includePatterns && includePatterns.length > 0) {
    if (!matchesPatterns(url, includePatterns)) {
      return false;
    }
  }
  if (excludePatterns && excludePatterns.length > 0) {
    if (matchesPatterns(url, excludePatterns)) {
      return false;
    }
  }
  return true;
}
function isContentUrl(url) {
  const lowerUrl = url.toLowerCase();
  const nonContentPatterns = [
    // Legal and policy pages
    /\/(privacy|terms|tos|legal|cookie|gdpr|disclaimer|imprint|impressum)\b/i,
    /\/(privacy-policy|terms-of-service|terms-of-use|terms-and-conditions)\b/i,
    /\/(cookie-policy|data-protection|acceptable-use|user-agreement)\b/i,
    /\/(refund|cancellation|shipping|return)-?(policy)?\b/i,
    // Contact and support pages (usually not main content)
    /\/(contact|support|help|faq|feedback)\/?$/i,
    // About pages that are typically boilerplate
    /\/(about-us|careers|jobs|press|investors|team)\/?$/i,
    // Authentication and admin areas
    /\/(admin|login|auth|account|dashboard|profile|settings)\//i,
    // E-commerce utility pages
    /\/(cart|checkout|payment|subscription|wishlist)\//i,
    // File downloads and assets
    /\/(uploads|assets|files|static|media|resources)\//i,
    // API endpoints
    /\/(api|graphql|rest|webhook)\//i
  ];
  if (nonContentPatterns.some((pattern) => pattern.test(lowerUrl))) {
    return false;
  }
  const skipExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".exe"];
  if (skipExtensions.some((ext) => lowerUrl.endsWith(ext))) {
    return false;
  }
  return true;
}

// src/utils/metadata-extractor.ts
function extractMetadata(html, baseUrl) {
  return extractWebsiteMetadata(html, baseUrl);
}
function extractWebsiteMetadata(html, baseUrl) {
  const { document } = parseHTML2(html);
  const metadata = {
    title: null,
    description: null,
    author: null,
    language: null,
    charset: null,
    favicon: null,
    canonical: null,
    image: null,
    keywords: null,
    robots: null,
    themeColor: null,
    openGraph: null,
    twitter: null
  };
  metadata.title = extractTitle(document);
  metadata.description = extractMetaContent(document, "description");
  metadata.author = extractMetaContent(document, "author");
  metadata.language = extractLanguage(document);
  metadata.charset = extractCharset(document);
  metadata.favicon = extractFavicon(document, baseUrl);
  metadata.canonical = extractCanonical(document, baseUrl);
  metadata.image = extractMetaContent(document, "og:image") || extractMetaContent(document, "twitter:image");
  metadata.keywords = extractKeywords(document);
  metadata.robots = extractMetaContent(document, "robots");
  metadata.themeColor = extractMetaContent(document, "theme-color");
  metadata.openGraph = extractOpenGraph(document);
  metadata.twitter = extractTwitterCard(document);
  return metadata;
}
function extractTitle(document) {
  const titleElement = document.querySelector("title");
  if (titleElement?.textContent) {
    return titleElement.textContent.trim();
  }
  return extractMetaContent(document, "og:title");
}
function extractMetaContent(document, name) {
  const byName = document.querySelector(`meta[name="${name}"]`);
  if (byName) {
    const content = byName.getAttribute("content");
    if (content) return content.trim();
  }
  const byProperty = document.querySelector(`meta[property="${name}"]`);
  if (byProperty) {
    const content = byProperty.getAttribute("content");
    if (content) return content.trim();
  }
  return null;
}
function extractLanguage(document) {
  const lang = document.documentElement?.getAttribute("lang");
  return lang?.trim() || null;
}
function extractCharset(document) {
  const charsetMeta = document.querySelector("meta[charset]");
  if (charsetMeta) {
    const charset = charsetMeta.getAttribute("charset");
    if (charset) return charset.trim();
  }
  const httpEquivMeta = document.querySelector('meta[http-equiv="Content-Type"]');
  if (httpEquivMeta) {
    const content = httpEquivMeta.getAttribute("content");
    if (content) {
      const charsetMatch = content.match(/charset=([^\s;]+)/i);
      if (charsetMatch) return charsetMatch[1].trim();
    }
  }
  return null;
}
function extractFavicon(document, baseUrl) {
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel*="icon"]'
  ];
  for (const selector of iconSelectors) {
    const iconLink = document.querySelector(selector);
    if (iconLink) {
      const href = iconLink.getAttribute("href");
      if (href) {
        return normalizeUrl(href, baseUrl);
      }
    }
  }
  try {
    return normalizeUrl("/favicon.ico", baseUrl);
  } catch {
    return null;
  }
}
function extractCanonical(document, baseUrl) {
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    const href = canonicalLink.getAttribute("href");
    if (href) {
      return normalizeUrl(href, baseUrl);
    }
  }
  return null;
}
function extractKeywords(document) {
  const keywordsContent = extractMetaContent(document, "keywords");
  if (!keywordsContent) {
    return null;
  }
  return keywordsContent.split(",").map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);
}
function extractOpenGraph(document) {
  const openGraph = {
    title: null,
    description: null,
    type: null,
    url: null,
    image: null,
    siteName: null,
    locale: null
  };
  openGraph.title = extractMetaContent(document, "og:title");
  openGraph.description = extractMetaContent(document, "og:description");
  openGraph.type = extractMetaContent(document, "og:type");
  openGraph.url = extractMetaContent(document, "og:url");
  openGraph.image = extractMetaContent(document, "og:image");
  openGraph.siteName = extractMetaContent(document, "og:site_name");
  openGraph.locale = extractMetaContent(document, "og:locale");
  if (Object.values(openGraph).every((value) => !value)) {
    return null;
  }
  return openGraph;
}
function extractTwitterCard(document) {
  const twitter = {
    card: null,
    site: null,
    creator: null,
    title: null,
    description: null,
    image: null
  };
  twitter.card = extractMetaContent(document, "twitter:card");
  twitter.site = extractMetaContent(document, "twitter:site");
  twitter.creator = extractMetaContent(document, "twitter:creator");
  twitter.title = extractMetaContent(document, "twitter:title");
  twitter.description = extractMetaContent(document, "twitter:description");
  twitter.image = extractMetaContent(document, "twitter:image");
  if (Object.values(twitter).every((value) => !value)) {
    return null;
  }
  return twitter;
}

// src/utils/logger.ts
import pino from "pino";
function hasPinoPretty() {
  try {
    __require.resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
}
function createLogger(name = "reader", level = process.env.LOG_LEVEL || "info") {
  const usePretty = process.env.NODE_ENV !== "production" && hasPinoPretty();
  return pino({
    name,
    level,
    transport: usePretty ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname"
      }
    } : void 0
  });
}
var logger = createLogger();

// src/utils/robots-parser.ts
function parseRobotsTxt(content, userAgent = "*") {
  const rules = {
    disallowedPaths: [],
    allowedPaths: [],
    crawlDelay: null
  };
  const lines = content.split("\n").map((line) => line.trim());
  let currentUserAgent = "";
  let matchesUserAgent = false;
  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    if (directive === "user-agent") {
      currentUserAgent = value.toLowerCase();
      matchesUserAgent = currentUserAgent === "*" || currentUserAgent === userAgent.toLowerCase();
    } else if (matchesUserAgent) {
      if (directive === "disallow" && value) {
        rules.disallowedPaths.push(value);
      } else if (directive === "allow" && value) {
        rules.allowedPaths.push(value);
      } else if (directive === "crawl-delay") {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          rules.crawlDelay = delay * 1e3;
        }
      }
    }
  }
  return rules;
}
function isPathAllowed(path, rules) {
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  for (const allowedPath of rules.allowedPaths) {
    if (pathMatches(normalizedPath, allowedPath)) {
      return true;
    }
  }
  for (const disallowedPath of rules.disallowedPaths) {
    if (pathMatches(normalizedPath, disallowedPath)) {
      return false;
    }
  }
  return true;
}
function pathMatches(path, pattern) {
  if (!pattern) {
    return false;
  }
  let regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  if (regexPattern.endsWith("\\$")) {
    regexPattern = regexPattern.slice(0, -2) + "$";
  } else {
    regexPattern = "^" + regexPattern;
  }
  try {
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  } catch {
    return path.startsWith(pattern);
  }
}
async function fetchRobotsTxt(baseUrl) {
  try {
    const url = new URL("/robots.txt", baseUrl);
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ReaderEngine/1.0"
      }
    });
    if (!response.ok) {
      return null;
    }
    const content = await response.text();
    return parseRobotsTxt(content, "ReaderEngine");
  } catch {
    return null;
  }
}
function isUrlAllowed(url, rules) {
  if (!rules) {
    return true;
  }
  try {
    const parsedUrl = new URL(url);
    return isPathAllowed(parsedUrl.pathname + parsedUrl.search, rules);
  } catch {
    return true;
  }
}

// src/types.ts
var DEFAULT_OPTIONS = {
  urls: [],
  formats: ["markdown"],
  timeoutMs: 3e4,
  includePatterns: [],
  excludePatterns: [],
  // Content cleaning defaults
  removeAds: true,
  removeBase64Images: true,
  onlyMainContent: true,
  includeTags: [],
  excludeTags: [],
  skipTLSVerification: true,
  // Batch defaults
  batchConcurrency: 1,
  batchTimeoutMs: 3e5,
  maxRetries: 2,
  onProgress: () => {
  },
  // Default no-op progress callback
  // Hero-specific defaults
  verbose: false,
  showChrome: false
};

// src/engines/types.ts
var ENGINE_CONFIGS = {
  http: {
    name: "http",
    timeout: 3e3,
    maxTimeout: 1e4,
    quality: 100,
    features: {
      javascript: false,
      cloudflare: false,
      tlsFingerprint: false,
      waitFor: false,
      screenshots: false
    }
  },
  tlsclient: {
    name: "tlsclient",
    timeout: 5e3,
    maxTimeout: 15e3,
    quality: 80,
    features: {
      javascript: false,
      cloudflare: false,
      tlsFingerprint: true,
      waitFor: false,
      screenshots: false
    }
  },
  hero: {
    name: "hero",
    timeout: 3e4,
    maxTimeout: 6e4,
    quality: 50,
    features: {
      javascript: true,
      cloudflare: true,
      tlsFingerprint: true,
      waitFor: true,
      screenshots: true
    }
  }
};
var DEFAULT_ENGINE_ORDER = ["http", "tlsclient", "hero"];

// src/engines/errors.ts
var EngineError = class extends Error {
  engine;
  retryable;
  constructor(engine, message, options) {
    super(`[${engine}] ${message}`);
    this.name = "EngineError";
    this.engine = engine;
    this.retryable = options?.retryable ?? true;
    this.cause = options?.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var ChallengeDetectedError = class extends EngineError {
  challengeType;
  constructor(engine, challengeType) {
    super(engine, `Challenge detected: ${challengeType || "unknown"}`, { retryable: true });
    this.name = "ChallengeDetectedError";
    this.challengeType = challengeType || "unknown";
  }
};
var InsufficientContentError = class extends EngineError {
  contentLength;
  threshold;
  constructor(engine, contentLength, threshold = 100) {
    super(engine, `Insufficient content: ${contentLength} chars (threshold: ${threshold})`, { retryable: true });
    this.name = "InsufficientContentError";
    this.contentLength = contentLength;
    this.threshold = threshold;
  }
};
var HttpError = class extends EngineError {
  statusCode;
  constructor(engine, statusCode, statusText) {
    const retryable = statusCode >= 500 || statusCode === 429;
    super(engine, `HTTP ${statusCode}${statusText ? `: ${statusText}` : ""}`, { retryable });
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
};
var EngineTimeoutError = class extends EngineError {
  timeoutMs;
  constructor(engine, timeoutMs) {
    super(engine, `Timeout after ${timeoutMs}ms`, { retryable: true });
    this.name = "EngineTimeoutError";
    this.timeoutMs = timeoutMs;
  }
};
var EngineUnavailableError = class extends EngineError {
  constructor(engine, reason) {
    super(engine, reason || "Engine not available", { retryable: false });
    this.name = "EngineUnavailableError";
  }
};
var AllEnginesFailedError = class extends Error {
  attemptedEngines;
  errors;
  constructor(attemptedEngines, errors) {
    const summary = attemptedEngines.map((e) => `${e}: ${errors.get(e)?.message || "unknown"}`).join("; ");
    super(`All engines failed: ${summary}`);
    this.name = "AllEnginesFailedError";
    this.attemptedEngines = attemptedEngines;
    this.errors = errors;
  }
};

// src/engines/http/index.ts
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};
var CHALLENGE_PATTERNS = [
  // Cloudflare
  "cf-browser-verification",
  "cf_chl_opt",
  "challenge-platform",
  "cf-spinner",
  "Just a moment",
  "Checking your browser",
  "checking if the site connection is secure",
  "Enable JavaScript and cookies",
  "Attention Required",
  "_cf_chl_tk",
  "Verifying you are human",
  "cf-turnstile",
  "/cdn-cgi/challenge-platform/",
  // Generic bot detection
  "Please Wait...",
  "DDoS protection by",
  "Access denied",
  "bot detection",
  "are you a robot",
  "complete the security check"
];
var CLOUDFLARE_INFRA_PATTERNS = ["/cdn-cgi/", "cloudflare", "__cf_bm", "cf-ray"];
var MIN_CONTENT_LENGTH = 100;
var HttpEngine = class {
  config = ENGINE_CONFIGS.http;
  async scrape(meta) {
    const startTime = Date.now();
    const { url, options, logger: logger4, abortSignal } = meta;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.maxTimeout);
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
      }
      logger4?.debug(`[http] Fetching ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...DEFAULT_HEADERS,
          ...options.headers || {}
        },
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const html = await response.text();
      logger4?.debug(`[http] Got response: ${response.status} (${html.length} chars) in ${duration}ms`);
      if (response.status >= 400) {
        throw new HttpError("http", response.status, response.statusText);
      }
      const challengeType = this.detectChallenge(html);
      if (challengeType) {
        logger4?.debug(`[http] Challenge detected: ${challengeType}`);
        throw new ChallengeDetectedError("http", challengeType);
      }
      const textContent = this.extractText(html);
      if (textContent.length < MIN_CONTENT_LENGTH) {
        logger4?.debug(`[http] Insufficient content: ${textContent.length} chars`);
        throw new InsufficientContentError("http", textContent.length, MIN_CONTENT_LENGTH);
      }
      return {
        html,
        url: response.url,
        statusCode: response.status,
        contentType: response.headers.get("content-type") || void 0,
        headers: this.headersToRecord(response.headers),
        engine: "http",
        duration
      };
    } catch (error) {
      if (error instanceof ChallengeDetectedError || error instanceof InsufficientContentError || error instanceof HttpError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new EngineTimeoutError("http", this.config.maxTimeout);
        }
        throw new EngineError("http", error.message, { cause: error });
      }
      throw new EngineError("http", String(error));
    }
  }
  /**
   * Detect challenge patterns in HTML
   * @returns Challenge type or null if no challenge detected
   */
  detectChallenge(html) {
    const htmlLower = html.toLowerCase();
    const hasCloudflare = CLOUDFLARE_INFRA_PATTERNS.some((p) => htmlLower.includes(p.toLowerCase()));
    for (const pattern of CHALLENGE_PATTERNS) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        if (hasCloudflare || pattern.includes("cf")) {
          return "cloudflare";
        }
        return "bot-detection";
      }
    }
    return null;
  }
  /**
   * Convert Headers to Record<string, string>
   */
  headersToRecord(headers) {
    const record = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  /**
   * Extract visible text from HTML (rough extraction)
   */
  extractText(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  isAvailable() {
    return true;
  }
};
var httpEngine = new HttpEngine();

// src/engines/tlsclient/index.ts
import { gotScraping } from "got-scraping";
var JS_REQUIRED_PATTERNS = [
  // Cloudflare JS challenge
  "cf-browser-verification",
  "challenge-platform",
  "_cf_chl_tk",
  "/cdn-cgi/challenge-platform/",
  // Generic JS requirements
  "Enable JavaScript",
  "JavaScript is required",
  "Please enable JavaScript",
  "requires JavaScript",
  "noscript"
];
var BLOCKED_PATTERNS = [
  "Access denied",
  "Sorry, you have been blocked",
  "bot detected",
  "suspicious activity",
  "too many requests"
];
var MIN_CONTENT_LENGTH2 = 100;
var TlsClientEngine = class {
  config = ENGINE_CONFIGS.tlsclient;
  available = true;
  constructor() {
    try {
      if (!gotScraping) {
        this.available = false;
      }
    } catch {
      this.available = false;
    }
  }
  async scrape(meta) {
    if (!this.available) {
      throw new EngineUnavailableError("tlsclient", "got-scraping not available");
    }
    const startTime = Date.now();
    const { url, options, logger: logger4, abortSignal } = meta;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.maxTimeout);
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
      }
      logger4?.debug(`[tlsclient] Fetching ${url}`);
      const response = await gotScraping({
        url,
        timeout: {
          request: this.config.maxTimeout
        },
        headers: options.headers,
        followRedirect: true
        // got-scraping handles browser fingerprinting automatically
        // It uses header generators and proper TLS settings
      });
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const html = response.body;
      logger4?.debug(`[tlsclient] Got response: ${response.statusCode} (${html.length} chars) in ${duration}ms`);
      if (response.statusCode >= 400) {
        throw new HttpError("tlsclient", response.statusCode, response.statusMessage);
      }
      const challengeType = this.detectJsRequired(html);
      if (challengeType) {
        logger4?.debug(`[tlsclient] JS required: ${challengeType}`);
        throw new ChallengeDetectedError("tlsclient", challengeType);
      }
      const blockedReason = this.detectBlocked(html);
      if (blockedReason) {
        logger4?.debug(`[tlsclient] Blocked: ${blockedReason}`);
        throw new ChallengeDetectedError("tlsclient", `blocked: ${blockedReason}`);
      }
      const textContent = this.extractText(html);
      if (textContent.length < MIN_CONTENT_LENGTH2) {
        logger4?.debug(`[tlsclient] Insufficient content: ${textContent.length} chars`);
        throw new InsufficientContentError("tlsclient", textContent.length, MIN_CONTENT_LENGTH2);
      }
      return {
        html,
        url: response.url,
        statusCode: response.statusCode,
        contentType: response.headers["content-type"],
        headers: response.headers,
        engine: "tlsclient",
        duration
      };
    } catch (error) {
      if (error instanceof ChallengeDetectedError || error instanceof InsufficientContentError || error instanceof HttpError || error instanceof EngineUnavailableError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === "TimeoutError" || error.message.includes("timeout")) {
          throw new EngineTimeoutError("tlsclient", this.config.maxTimeout);
        }
        if (error.name === "AbortError") {
          throw new EngineTimeoutError("tlsclient", this.config.maxTimeout);
        }
        throw new EngineError("tlsclient", error.message, { cause: error });
      }
      throw new EngineError("tlsclient", String(error));
    }
  }
  /**
   * Detect patterns that require JS execution
   */
  detectJsRequired(html) {
    const htmlLower = html.toLowerCase();
    for (const pattern of JS_REQUIRED_PATTERNS) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        if (pattern.includes("cf") || pattern.includes("cloudflare")) {
          return "cloudflare-js";
        }
        return "js-required";
      }
    }
    return null;
  }
  /**
   * Detect blocked/denied patterns
   */
  detectBlocked(html) {
    const htmlLower = html.toLowerCase();
    for (const pattern of BLOCKED_PATTERNS) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        return pattern;
      }
    }
    return null;
  }
  /**
   * Extract visible text from HTML
   */
  extractText(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  isAvailable() {
    return this.available;
  }
};
var tlsClientEngine = new TlsClientEngine();

// src/cloudflare/detector.ts
var CLOUDFLARE_CHALLENGE_SELECTORS = [
  "#challenge-running",
  "#challenge-stage",
  "#challenge-form",
  ".cf-browser-verification",
  "#cf-wrapper",
  "#cf-hcaptcha-container",
  "#turnstile-wrapper"
];
var CLOUDFLARE_TEXT_PATTERNS = [
  "checking if the site connection is secure",
  "this process is automatic. your browser will redirect",
  "ray id:",
  "performance & security by cloudflare"
];
var CLOUDFLARE_INFRA_PATTERNS2 = [
  "/cdn-cgi/",
  "cloudflare",
  "__cf_bm",
  "cf-ray"
];
var CLOUDFLARE_BLOCKED_PATTERNS = [
  "sorry, you have been blocked",
  "ray id:"
];
async function detectChallenge(hero) {
  const signals = [];
  let type = "none";
  let hasCloudflareInfra = false;
  let hasChallengeIndicator = false;
  try {
    if (!hero.document) {
      return {
        isChallenge: false,
        type: "none",
        confidence: 0,
        signals: ["No document available"]
      };
    }
    const html = await hero.document.documentElement.outerHTML;
    const htmlLower = html.toLowerCase();
    for (const pattern of CLOUDFLARE_INFRA_PATTERNS2) {
      if (htmlLower.includes(pattern)) {
        hasCloudflareInfra = true;
        signals.push(`Cloudflare infra: "${pattern}"`);
        break;
      }
    }
    if (!hasCloudflareInfra) {
      return {
        isChallenge: false,
        type: "none",
        confidence: 0,
        signals: ["No Cloudflare infrastructure detected"]
      };
    }
    for (const selector of CLOUDFLARE_CHALLENGE_SELECTORS) {
      try {
        const element = await hero.document.querySelector(selector);
        if (element) {
          hasChallengeIndicator = true;
          signals.push(`Challenge element: ${selector}`);
          type = "js_challenge";
        }
      } catch {
      }
    }
    for (const pattern of CLOUDFLARE_TEXT_PATTERNS) {
      if (htmlLower.includes(pattern)) {
        hasChallengeIndicator = true;
        signals.push(`Challenge text: "${pattern}"`);
        type = type === "none" ? "js_challenge" : type;
      }
    }
    if (htmlLower.includes("waiting for") && htmlLower.includes("to respond")) {
      hasChallengeIndicator = true;
      signals.push('Challenge text: "waiting for...to respond"');
      type = type === "none" ? "js_challenge" : type;
    }
    const hasBlocked = CLOUDFLARE_BLOCKED_PATTERNS.every((p) => htmlLower.includes(p));
    if (hasBlocked) {
      hasChallengeIndicator = true;
      signals.push("Cloudflare block page detected");
      type = "blocked";
    }
    const isChallenge = hasCloudflareInfra && hasChallengeIndicator;
    const confidence = isChallenge ? 100 : 0;
    return {
      isChallenge,
      type: isChallenge ? type : "none",
      confidence,
      signals
    };
  } catch (error) {
    return {
      isChallenge: false,
      type: "none",
      confidence: 0,
      signals: [`Error during detection: ${error.message}`]
    };
  }
}

// src/cloudflare/handler.ts
async function waitForChallengeResolution(hero, options) {
  const { maxWaitMs = 45e3, pollIntervalMs = 500, verbose = false, initialUrl } = options;
  const startTime = Date.now();
  const log = (msg) => verbose && console.log(`   ${msg}`);
  while (Date.now() - startTime < maxWaitMs) {
    const elapsed = Date.now() - startTime;
    try {
      const currentUrl = await hero.url;
      if (currentUrl !== initialUrl) {
        log(`\u2713 URL changed: ${initialUrl} \u2192 ${currentUrl}`);
        log(`  Waiting for new page to load...`);
        try {
          await hero.waitForLoad("DomContentLoaded", { timeoutMs: 3e4 });
          log(`  DOMContentLoaded`);
        } catch {
          log(`  DOMContentLoaded timeout, continuing...`);
        }
        await hero.waitForPaintingStable().catch(() => {
        });
        log(`  Page stabilized`);
        return { resolved: true, method: "url_redirect", waitedMs: elapsed };
      }
    } catch {
    }
    const detection = await detectChallenge(hero);
    if (!detection.isChallenge) {
      log(`\u2713 Challenge signals cleared (confidence dropped to ${detection.confidence})`);
      log(`  Waiting for page to load...`);
      try {
        await hero.waitForLoad("DomContentLoaded", { timeoutMs: 3e4 });
        log(`  DOMContentLoaded`);
      } catch {
        log(`  DOMContentLoaded timeout, continuing...`);
      }
      await hero.waitForPaintingStable().catch(() => {
      });
      log(`  Page stabilized`);
      return { resolved: true, method: "signals_cleared", waitedMs: elapsed };
    }
    log(
      `\u23F3 ${(elapsed / 1e3).toFixed(1)}s - Still challenge (confidence: ${detection.confidence})`
    );
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return {
    resolved: false,
    method: "timeout",
    waitedMs: Date.now() - startTime
  };
}

// src/engines/hero/index.ts
var MIN_CONTENT_LENGTH3 = 100;
var HeroEngine = class {
  config = ENGINE_CONFIGS.hero;
  async scrape(meta) {
    const startTime = Date.now();
    const { url, options, logger: logger4, abortSignal } = meta;
    const pool = options.pool;
    if (!pool) {
      throw new EngineUnavailableError("hero", "Browser pool not available");
    }
    if (abortSignal?.aborted) {
      throw new EngineTimeoutError("hero", 0);
    }
    logger4?.debug(`[hero] Starting browser scrape of ${url}`);
    try {
      const result = await pool.withBrowser(async (hero) => {
        let aborted = false;
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            aborted = true;
          }, { once: true });
        }
        const timeoutMs = options.timeoutMs || this.config.maxTimeout;
        await hero.goto(url, { timeoutMs });
        if (aborted) {
          throw new EngineTimeoutError("hero", Date.now() - startTime);
        }
        try {
          await hero.waitForLoad("DomContentLoaded", { timeoutMs });
        } catch {
        }
        await hero.waitForPaintingStable();
        if (aborted) {
          throw new EngineTimeoutError("hero", Date.now() - startTime);
        }
        const initialUrl = await hero.url;
        const detection = await detectChallenge(hero);
        if (detection.isChallenge) {
          logger4?.debug(`[hero] Challenge detected: ${detection.type}`);
          if (detection.type === "blocked") {
            throw new ChallengeDetectedError("hero", "blocked");
          }
          const resolution = await waitForChallengeResolution(hero, {
            maxWaitMs: 45e3,
            pollIntervalMs: 500,
            verbose: options.verbose,
            initialUrl
          });
          if (!resolution.resolved) {
            throw new ChallengeDetectedError("hero", `unresolved: ${detection.type}`);
          }
          logger4?.debug(`[hero] Challenge resolved via ${resolution.method} in ${resolution.waitedMs}ms`);
        }
        if (aborted) {
          throw new EngineTimeoutError("hero", Date.now() - startTime);
        }
        await this.waitForFinalPage(hero, url, logger4);
        if (aborted) {
          throw new EngineTimeoutError("hero", Date.now() - startTime);
        }
        if (options.waitForSelector) {
          try {
            await hero.waitForElement(hero.document.querySelector(options.waitForSelector), {
              timeoutMs
            });
          } catch {
            logger4?.debug(`[hero] Selector not found: ${options.waitForSelector}`);
          }
        }
        const html = await hero.document.documentElement.outerHTML;
        const finalUrl = await hero.url;
        const textContent = this.extractText(html);
        if (textContent.length < MIN_CONTENT_LENGTH3) {
          logger4?.debug(`[hero] Insufficient content: ${textContent.length} chars`);
          throw new InsufficientContentError("hero", textContent.length, MIN_CONTENT_LENGTH3);
        }
        const duration = Date.now() - startTime;
        logger4?.debug(`[hero] Success: ${html.length} chars in ${duration}ms`);
        return {
          html,
          url: finalUrl,
          statusCode: 200,
          // Hero doesn't expose status code directly
          engine: "hero",
          duration
        };
      });
      return result;
    } catch (error) {
      if (error instanceof ChallengeDetectedError || error instanceof InsufficientContentError || error instanceof EngineTimeoutError || error instanceof EngineUnavailableError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === "TimeoutError" || error.message.includes("timeout")) {
          throw new EngineTimeoutError("hero", this.config.maxTimeout);
        }
        if (error.message.includes("Navigation") || error.message.includes("ERR_")) {
          throw new EngineError("hero", `Navigation failed: ${error.message}`, { cause: error });
        }
        throw new EngineError("hero", error.message, { cause: error });
      }
      throw new EngineError("hero", String(error));
    }
  }
  /**
   * Wait for the final page to load after any Cloudflare redirects
   */
  async waitForFinalPage(hero, originalUrl, logger4) {
    const maxWaitMs = 15e3;
    const startTime = Date.now();
    try {
      await hero.waitForLoad("AllContentLoaded", { timeoutMs: maxWaitMs });
    } catch {
    }
    let currentUrl = await hero.url;
    const normalizeUrl2 = (url) => url.replace(/\/+$/, "");
    const urlChanged = normalizeUrl2(currentUrl) !== normalizeUrl2(originalUrl);
    if (urlChanged || currentUrl.includes("__cf_chl")) {
      logger4?.debug(`[hero] Cloudflare redirect detected: ${originalUrl} \u2192 ${currentUrl}`);
      let lastUrl = currentUrl;
      let stableCount = 0;
      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          currentUrl = await hero.url;
          if (currentUrl === lastUrl) {
            stableCount++;
            if (stableCount >= 2) {
              break;
            }
          } else {
            stableCount = 0;
            lastUrl = currentUrl;
            logger4?.debug(`[hero] URL changed to: ${currentUrl}`);
          }
        } catch {
        }
      }
      try {
        await hero.waitForLoad("AllContentLoaded", { timeoutMs: 1e4 });
      } catch {
      }
    }
    await hero.waitForPaintingStable();
    await new Promise((resolve) => setTimeout(resolve, 2e3));
  }
  /**
   * Extract visible text from HTML
   */
  extractText(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  isAvailable() {
    return true;
  }
};
var heroEngine = new HeroEngine();

// src/engines/orchestrator.ts
var ENGINE_REGISTRY = {
  http: httpEngine,
  tlsclient: tlsClientEngine,
  hero: heroEngine
};
var EngineOrchestrator = class {
  options;
  engines;
  engineOrder;
  constructor(options = {}) {
    this.options = options;
    this.engineOrder = this.resolveEngineOrder();
    this.engines = this.engineOrder.map((name) => ENGINE_REGISTRY[name]).filter((engine) => engine.isAvailable());
  }
  /**
   * Resolve the engine order based on options
   */
  resolveEngineOrder() {
    if (this.options.forceEngine) {
      return [this.options.forceEngine];
    }
    let order = this.options.engines || [...DEFAULT_ENGINE_ORDER];
    if (this.options.skipEngines) {
      order = order.filter((e) => !this.options.skipEngines.includes(e));
    }
    return order;
  }
  /**
   * Get available engines
   */
  getAvailableEngines() {
    return this.engines.map((e) => e.config.name);
  }
  /**
   * Scrape a URL using the engine cascade
   *
   * @param meta - Engine metadata (url, options, logger, abortSignal)
   * @returns Scrape result with engine metadata
   * @throws AllEnginesFailedError if all engines fail
   */
  async scrape(meta) {
    const attemptedEngines = [];
    const engineErrors = /* @__PURE__ */ new Map();
    const logger4 = meta.logger || this.options.logger;
    const verbose = this.options.verbose || meta.options.verbose;
    if (this.engines.length === 0) {
      throw new AllEnginesFailedError([], engineErrors);
    }
    const log = (msg) => {
      if (verbose) {
        logger4?.info(msg);
      } else {
        logger4?.debug(msg);
      }
    };
    log(`[orchestrator] Starting scrape of ${meta.url} with engines: ${this.engineOrder.join(" \u2192 ")}`);
    for (const engine of this.engines) {
      const engineName = engine.config.name;
      attemptedEngines.push(engineName);
      try {
        log(`[orchestrator] Trying ${engineName} engine...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), engine.config.maxTimeout);
        if (meta.abortSignal) {
          meta.abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        try {
          const result = await engine.scrape({
            ...meta,
            abortSignal: controller.signal
          });
          clearTimeout(timeoutId);
          log(`[orchestrator] \u2713 ${engineName} succeeded in ${result.duration}ms`);
          return {
            ...result,
            attemptedEngines,
            engineErrors
          };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        engineErrors.set(engineName, err);
        if (error instanceof ChallengeDetectedError) {
          log(`[orchestrator] ${engineName} detected challenge: ${error.challengeType}`);
        } else if (error instanceof InsufficientContentError) {
          log(`[orchestrator] ${engineName} insufficient content: ${error.contentLength} chars`);
        } else if (error instanceof HttpError) {
          log(`[orchestrator] ${engineName} HTTP error: ${error.statusCode}`);
        } else if (error instanceof EngineTimeoutError) {
          log(`[orchestrator] ${engineName} timed out after ${error.timeoutMs}ms`);
        } else if (error instanceof EngineUnavailableError) {
          log(`[orchestrator] ${engineName} unavailable: ${err.message}`);
        } else {
          log(`[orchestrator] ${engineName} failed: ${err.message}`);
        }
        if (!this.shouldRetry(error)) {
          log(`[orchestrator] Non-retryable error, stopping cascade`);
          break;
        }
        log(`[orchestrator] Falling back to next engine...`);
      }
    }
    log(`[orchestrator] All engines failed for ${meta.url}`);
    throw new AllEnginesFailedError(attemptedEngines, engineErrors);
  }
  /**
   * Determine if we should retry with next engine
   */
  shouldRetry(error) {
    if (error instanceof ChallengeDetectedError || error instanceof InsufficientContentError || error instanceof EngineTimeoutError) {
      return true;
    }
    if (error instanceof HttpError) {
      return error.statusCode === 403 || error.statusCode === 404 || error.statusCode === 429 || error.statusCode >= 500;
    }
    if (error instanceof EngineUnavailableError) {
      return true;
    }
    if (error instanceof EngineError) {
      return error.retryable;
    }
    return true;
  }
};

// src/scraper.ts
var Scraper = class {
  options;
  logger = createLogger("scraper");
  robotsCache = /* @__PURE__ */ new Map();
  constructor(options) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
  }
  /**
   * Get robots.txt rules for a URL, cached per domain
   */
  async getRobotsRules(url) {
    const origin = new URL(url).origin;
    if (!this.robotsCache.has(origin)) {
      const rules = await fetchRobotsTxt(origin);
      this.robotsCache.set(origin, rules);
    }
    return this.robotsCache.get(origin) ?? null;
  }
  /**
   * Scrape all URLs
   *
   * @returns Scrape result with pages and metadata
   */
  async scrape() {
    const startTime = Date.now();
    const results = await this.scrapeWithConcurrency();
    return this.buildScrapeResult(results, startTime);
  }
  /**
   * Scrape URLs with concurrency control
   */
  async scrapeWithConcurrency() {
    const limit = pLimit(this.options.batchConcurrency || 1);
    const tasks = this.options.urls.map(
      (url, index) => limit(() => this.scrapeSingleUrlWithRetry(url, index))
    );
    const batchPromise = Promise.all(tasks);
    if (this.options.batchTimeoutMs && this.options.batchTimeoutMs > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Batch operation timed out after ${this.options.batchTimeoutMs}ms`));
        }, this.options.batchTimeoutMs);
      });
      return Promise.race([batchPromise, timeoutPromise]);
    }
    return batchPromise;
  }
  /**
   * Scrape a single URL with retry logic
   */
  async scrapeSingleUrlWithRetry(url, index) {
    const maxRetries = this.options.maxRetries || 2;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.scrapeSingleUrl(url, index);
        if (result) {
          return { result };
        }
        lastError = `Failed to scrape ${url}: No content returned`;
      } catch (error) {
        lastError = error.message;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1e3;
          this.logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${url} in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    this.logger.error(`Failed to scrape ${url} after ${maxRetries + 1} attempts: ${lastError}`);
    return { result: null, error: lastError };
  }
  /**
   * Scrape a single URL using the engine orchestrator
   */
  async scrapeSingleUrl(url, index) {
    const startTime = Date.now();
    const robotsRules = await this.getRobotsRules(url);
    if (!isUrlAllowed(url, robotsRules)) {
      throw new Error(`URL blocked by robots.txt: ${url}`);
    }
    try {
      const orchestrator = new EngineOrchestrator({
        engines: this.options.engines,
        skipEngines: this.options.skipEngines,
        forceEngine: this.options.forceEngine,
        logger: this.logger,
        verbose: this.options.verbose
      });
      const engineResult = await orchestrator.scrape({
        url,
        options: this.options,
        logger: this.logger
      });
      if (this.options.verbose) {
        this.logger.info(
          `[scraper] ${url} scraped with ${engineResult.engine} engine in ${engineResult.duration}ms (attempted: ${engineResult.attemptedEngines.join(" \u2192 ")})`
        );
      }
      const cleanedHtml = cleanContent(engineResult.html, engineResult.url, {
        removeAds: this.options.removeAds,
        removeBase64Images: this.options.removeBase64Images,
        onlyMainContent: this.options.onlyMainContent,
        includeTags: this.options.includeTags,
        excludeTags: this.options.excludeTags
      });
      const websiteMetadata = extractMetadata(cleanedHtml, engineResult.url);
      const duration = Date.now() - startTime;
      const markdown = this.options.formats.includes("markdown") ? htmlToMarkdown(cleanedHtml) : void 0;
      const htmlOutput = this.options.formats.includes("html") ? cleanedHtml : void 0;
      if (this.options.onProgress) {
        this.options.onProgress({
          completed: index + 1,
          total: this.options.urls.length,
          currentUrl: url
        });
      }
      let proxyMetadata;
      if (this.options.proxy) {
        const proxy = this.options.proxy;
        if (proxy.url) {
          try {
            const proxyUrl = new URL(proxy.url);
            proxyMetadata = {
              host: proxyUrl.hostname,
              port: parseInt(proxyUrl.port, 10) || 80,
              country: proxy.country
            };
          } catch {
          }
        } else if (proxy.host && proxy.port) {
          proxyMetadata = {
            host: proxy.host,
            port: proxy.port,
            country: proxy.country
          };
        }
      }
      const result = {
        markdown,
        html: htmlOutput,
        metadata: {
          baseUrl: url,
          totalPages: 1,
          scrapedAt: (/* @__PURE__ */ new Date()).toISOString(),
          duration,
          website: websiteMetadata,
          proxy: proxyMetadata
        }
      };
      return result;
    } catch (error) {
      if (error instanceof AllEnginesFailedError) {
        const engineSummary = error.attemptedEngines.map((e) => `${e}: ${error.errors.get(e)?.message || "unknown"}`).join("; ");
        this.logger.error(`Failed to scrape ${url}: All engines failed - ${engineSummary}`);
      } else if (error instanceof Error) {
        this.logger.error(`Failed to scrape ${url}: ${error.message}`);
      } else {
        this.logger.error(`Failed to scrape ${url}: ${String(error)}`);
      }
      if (this.options.onProgress) {
        this.options.onProgress({
          completed: index + 1,
          total: this.options.urls.length,
          currentUrl: url
        });
      }
      return null;
    }
  }
  /**
   * Build final scrape result
   */
  buildScrapeResult(results, startTime) {
    const successful = results.filter((r) => r.result !== null).map((r) => r.result);
    const errors = [];
    results.forEach((r, index) => {
      if (r.result === null && r.error) {
        errors.push({ url: this.options.urls[index], error: r.error });
      }
    });
    const batchMetadata = {
      totalUrls: this.options.urls.length,
      successfulUrls: successful.length,
      failedUrls: results.filter((r) => r.result === null).length,
      scrapedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalDuration: Date.now() - startTime,
      errors
    };
    return {
      data: successful,
      batchMetadata
    };
  }
};
async function scrape(options) {
  const scraper = new Scraper(options);
  return scraper.scrape();
}

// src/crawler.ts
import { parseHTML as parseHTML3 } from "linkedom";

// src/utils/rate-limiter.ts
import pLimit2 from "p-limit";
async function rateLimit(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/crawler.ts
var Crawler = class {
  options;
  visited = /* @__PURE__ */ new Set();
  queue = [];
  urls = [];
  pool;
  logger = createLogger("crawler");
  robotsRules = null;
  constructor(options) {
    if (!options.pool) {
      throw new Error("Browser pool must be provided. Use ReaderClient for automatic pool management.");
    }
    this.pool = options.pool;
    this.options = {
      url: options.url,
      depth: options.depth || 1,
      maxPages: options.maxPages || 20,
      scrape: options.scrape || false,
      delayMs: options.delayMs || 1e3,
      timeoutMs: options.timeoutMs,
      includePatterns: options.includePatterns,
      excludePatterns: options.excludePatterns,
      formats: options.formats || ["markdown", "html"],
      scrapeConcurrency: options.scrapeConcurrency || 2,
      proxy: options.proxy,
      userAgent: options.userAgent,
      verbose: options.verbose || false,
      showChrome: options.showChrome || false,
      connectionToCore: options.connectionToCore,
      // Content cleaning options
      removeAds: options.removeAds,
      removeBase64Images: options.removeBase64Images
    };
  }
  /**
   * Start crawling
   */
  async crawl() {
    const startTime = Date.now();
    this.robotsRules = await fetchRobotsTxt(this.options.url);
    if (this.robotsRules) {
      this.logger.info("Loaded robots.txt rules");
    }
    if (isUrlAllowed(this.options.url, this.robotsRules)) {
      this.queue.push({ url: this.options.url, depth: 0 });
    } else {
      this.logger.warn(`Seed URL blocked by robots.txt: ${this.options.url}`);
    }
    while (this.queue.length > 0 && this.urls.length < this.options.maxPages) {
      if (this.options.timeoutMs && Date.now() - startTime > this.options.timeoutMs) {
        this.logger.warn(`Crawl timed out after ${this.options.timeoutMs}ms`);
        break;
      }
      const item = this.queue.shift();
      const urlKey = getUrlKey(item.url);
      if (this.visited.has(urlKey)) {
        continue;
      }
      const result = await this.fetchPage(item.url);
      if (result) {
        this.urls.push(result.crawlUrl);
        this.visited.add(urlKey);
        if (item.depth < this.options.depth) {
          const links = this.extractLinks(result.html, item.url, item.depth + 1);
          this.queue.push(...links);
        }
      }
      const delay = this.robotsRules?.crawlDelay || this.options.delayMs;
      await rateLimit(delay);
    }
    const metadata = {
      totalUrls: this.urls.length,
      maxDepth: this.options.depth,
      totalDuration: Date.now() - startTime,
      seedUrl: this.options.url
    };
    let scraped;
    if (this.options.scrape) {
      scraped = await this.scrapeDiscoveredUrls();
    }
    return {
      urls: this.urls,
      scraped,
      metadata
    };
  }
  /**
   * Fetch a single page and extract basic info
   */
  async fetchPage(url) {
    try {
      return await this.pool.withBrowser(async (hero) => {
        await hero.goto(url, { timeoutMs: 3e4 });
        await hero.waitForPaintingStable();
        const initialUrl = await hero.url;
        const detection = await detectChallenge(hero);
        if (detection.isChallenge) {
          if (this.options.verbose) {
            this.logger.info(`Challenge detected on ${url}`);
          }
          const result = await waitForChallengeResolution(hero, {
            maxWaitMs: 45e3,
            pollIntervalMs: 500,
            verbose: this.options.verbose,
            initialUrl
          });
          if (!result.resolved) {
            throw new Error(`Challenge not resolved`);
          }
        }
        const title = await hero.document.title;
        const html = await hero.document.documentElement.outerHTML;
        let description = null;
        try {
          const metaDesc = await hero.document.querySelector('meta[name="description"]');
          if (metaDesc) {
            description = await metaDesc.getAttribute("content");
          }
        } catch {
        }
        return {
          crawlUrl: {
            url,
            title: title || "Untitled",
            description
          },
          html
        };
      });
    } catch (error) {
      this.logger.error(`Failed to fetch ${url}: ${error.message}`);
      return null;
    }
  }
  /**
   * Extract links from HTML content using DOM parsing
   * Handles all href formats (single quotes, double quotes, unquoted)
   */
  extractLinks(html, baseUrl, depth) {
    const links = [];
    const { document } = parseHTML3(html);
    document.querySelectorAll("a[href]").forEach((anchor) => {
      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;
      const href = rawHref.trim();
      if (!href) return;
      if (href.startsWith("#")) return;
      const lowerHref = href.toLowerCase();
      if (lowerHref.startsWith("javascript:") || lowerHref.startsWith("mailto:") || lowerHref.startsWith("tel:") || lowerHref.startsWith("data:") || lowerHref.startsWith("blob:") || lowerHref.startsWith("ftp:")) {
        return;
      }
      let resolved = resolveUrl(href, baseUrl);
      if (!resolved || !isValidUrl(resolved)) return;
      try {
        const parsed = new URL(resolved);
        parsed.hash = "";
        resolved = parsed.toString();
      } catch {
        return;
      }
      if (!isSameDomain(resolved, this.options.url)) return;
      if (!isContentUrl(resolved)) return;
      if (!shouldIncludeUrl(resolved, this.options.includePatterns, this.options.excludePatterns)) return;
      if (!isUrlAllowed(resolved, this.robotsRules)) return;
      const urlKey = getUrlKey(resolved);
      if (this.visited.has(urlKey) || this.queue.some((q) => getUrlKey(q.url) === urlKey)) {
        return;
      }
      links.push({ url: resolved, depth });
    });
    return links;
  }
  /**
   * Scrape all discovered URLs
   */
  async scrapeDiscoveredUrls() {
    const urls = this.urls.map((u) => u.url);
    return scrape({
      urls,
      formats: this.options.formats,
      batchConcurrency: this.options.scrapeConcurrency,
      proxy: this.options.proxy,
      userAgent: this.options.userAgent,
      verbose: this.options.verbose,
      showChrome: this.options.showChrome,
      pool: this.pool,
      // Content cleaning options
      removeAds: this.options.removeAds,
      removeBase64Images: this.options.removeBase64Images
    });
  }
};
async function crawl(options) {
  const crawler = new Crawler(options);
  return crawler.crawl();
}

// src/browser/pool.ts
import Hero from "@ulixee/hero";

// src/proxy/config.ts
function createProxyUrl(config) {
  if (config.url) {
    return config.url;
  }
  if (config.type === "residential") {
    const sessionId = `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return `http://customer-${config.username}_session-${sessionId}_country-${config.country || "us"}:${config.password}@${config.host}:${config.port}`;
  }
  return `http://${config.username}:${config.password}@${config.host}:${config.port}`;
}

// src/browser/hero-config.ts
function createHeroConfig(options = {}) {
  const config = {
    // Show or hide Chrome window
    showChrome: options.showChrome ?? false,
    // ============================================================================
    // CRITICAL: TLS fingerprint emulation
    // ============================================================================
    // Setting disableMitm to false enables TLS/TCP fingerprint emulation
    // This is ESSENTIAL for bypassing Cloudflare and other anti-bot systems
    disableMitm: false,
    // ============================================================================
    // Session management
    // ============================================================================
    // Use incognito for clean session state
    disableIncognito: false,
    // ============================================================================
    // Docker compatibility
    // ============================================================================
    // Required when running in containerized environments
    noChromeSandbox: true,
    // ============================================================================
    // DNS over TLS (mimics Chrome behavior)
    // ============================================================================
    // Using Cloudflare's DNS (1.1.1.1) over TLS makes the connection
    // look more like a real Chrome browser
    dnsOverTlsProvider: {
      host: "1.1.1.1",
      servername: "cloudflare-dns.com"
    },
    // ============================================================================
    // WebRTC IP leak prevention
    // ============================================================================
    // Masks the real IP address in WebRTC connections
    // Uses ipify.org to detect the public IP
    upstreamProxyIpMask: {
      ipLookupService: "https://api.ipify.org?format=json"
    },
    // ============================================================================
    // Locale and timezone
    // ============================================================================
    locale: "en-US",
    timezoneId: "America/New_York",
    // ============================================================================
    // Viewport (standard desktop size)
    // ============================================================================
    viewport: {
      width: 1920,
      height: 1080
    },
    // ============================================================================
    // User agent (if provided)
    // ============================================================================
    ...options.userAgent && { userAgent: options.userAgent },
    // ============================================================================
    // Connection to Core (if provided)
    // ============================================================================
    ...options.connectionToCore && { connectionToCore: options.connectionToCore }
  };
  if (options.proxy) {
    config.upstreamProxyUrl = createProxyUrl(options.proxy);
    config.upstreamProxyUseSystemDns = false;
  }
  return config;
}

// src/browser/pool.ts
var DEFAULT_POOL_CONFIG = {
  size: 2,
  retireAfterPageCount: 100,
  retireAfterAgeMs: 30 * 60 * 1e3,
  // 30 minutes
  recycleCheckInterval: 60 * 1e3,
  // 1 minute
  healthCheckInterval: 5 * 60 * 1e3,
  // 5 minutes
  maxConsecutiveFailures: 3,
  maxQueueSize: 100,
  queueTimeout: 60 * 1e3
  // 1 minute
};
function generateId() {
  return `browser_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
var BrowserPool = class {
  instances = [];
  available = [];
  inUse = /* @__PURE__ */ new Set();
  queue = [];
  config;
  proxy;
  recycleTimer;
  healthTimer;
  totalRequests = 0;
  totalRequestDuration = 0;
  showChrome;
  connectionToCore;
  userAgent;
  verbose;
  logger = createLogger("pool");
  constructor(config = {}, proxy, showChrome = false, connectionToCore, userAgent, verbose = false) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.proxy = proxy;
    this.showChrome = showChrome;
    this.connectionToCore = connectionToCore;
    this.userAgent = userAgent;
    this.verbose = verbose;
  }
  /**
   * Initialize the pool by pre-launching browsers
   */
  async initialize() {
    if (this.verbose) {
      this.logger.info(`Initializing pool with ${this.config.size} browsers...`);
    }
    const launchPromises = [];
    for (let i = 0; i < this.config.size; i++) {
      launchPromises.push(this.createInstance());
    }
    this.instances = await Promise.all(launchPromises);
    this.available = [...this.instances];
    this.startRecycling();
    this.startHealthChecks();
    if (this.verbose) {
      this.logger.info(`Pool ready: ${this.instances.length} browsers available`);
    }
  }
  /**
   * Shutdown the pool and close all browsers
   */
  async shutdown() {
    if (this.verbose) {
      const stats = this.getStats();
      this.logger.info(
        `Shutting down pool: ${stats.totalRequests} total requests processed, ${Math.round(stats.avgRequestDuration)}ms avg duration`
      );
    }
    if (this.recycleTimer) clearInterval(this.recycleTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    for (const item of this.queue) {
      item.reject(new Error("Pool shutting down"));
    }
    this.queue = [];
    const closePromises = this.instances.map((instance) => instance.hero.close().catch(() => {
    }));
    await Promise.all(closePromises);
    if (this.connectionToCore) {
      try {
        await this.connectionToCore.disconnect();
      } catch {
      }
      this.connectionToCore = void 0;
    }
    this.instances = [];
    this.available = [];
    this.inUse.clear();
  }
  /**
   * Acquire a browser from the pool
   */
  async acquire() {
    const instance = this.available.shift();
    if (!instance) {
      if (this.verbose) {
        this.logger.info(`No browsers available, queuing request (queue: ${this.queue.length + 1})`);
      }
      return this.queueRequest();
    }
    instance.status = "busy";
    instance.lastUsed = Date.now();
    this.inUse.add(instance);
    if (this.verbose) {
      this.logger.info(
        `Acquired browser ${instance.id} (available: ${this.available.length}, busy: ${this.inUse.size})`
      );
    }
    return instance.hero;
  }
  /**
   * Release a browser back to the pool
   */
  release(hero) {
    const instance = this.instances.find((i) => i.hero === hero);
    if (!instance) return;
    instance.status = "idle";
    instance.requestCount++;
    this.inUse.delete(instance);
    if (this.verbose) {
      this.logger.info(
        `Released browser ${instance.id} (requests: ${instance.requestCount}, available: ${this.available.length + 1})`
      );
    }
    if (this.shouldRecycle(instance)) {
      if (this.verbose) {
        this.logger.info(`Recycling browser ${instance.id} (age or request limit reached)`);
      }
      this.recycleInstance(instance).catch(() => {
      });
    } else {
      this.available.push(instance);
      this.processQueue();
    }
  }
  /**
   * Execute callback with auto-managed browser
   */
  async withBrowser(callback) {
    const startTime = Date.now();
    const hero = await this.acquire();
    try {
      const result = await callback(hero);
      this.totalRequests++;
      this.totalRequestDuration += Date.now() - startTime;
      return result;
    } finally {
      this.release(hero);
    }
  }
  /**
   * Get pool statistics
   */
  getStats() {
    const recycling = this.instances.filter((i) => i.status === "recycling").length;
    const unhealthy = this.instances.filter((i) => i.status === "unhealthy").length;
    return {
      total: this.instances.length,
      available: this.available.length,
      busy: this.inUse.size,
      recycling,
      unhealthy,
      queueLength: this.queue.length,
      totalRequests: this.totalRequests,
      avgRequestDuration: this.totalRequests > 0 ? this.totalRequestDuration / this.totalRequests : 0
    };
  }
  /**
   * Run health check
   */
  async healthCheck() {
    const issues = [];
    const stats = this.getStats();
    if (stats.unhealthy > 0) {
      issues.push(`${stats.unhealthy} unhealthy instances`);
    }
    if (stats.queueLength > this.config.maxQueueSize * 0.8) {
      issues.push(`Queue near capacity: ${stats.queueLength}/${this.config.maxQueueSize}`);
    }
    if (stats.available === 0 && stats.queueLength > 0) {
      issues.push("Pool saturated - all browsers busy with pending requests");
    }
    return {
      healthy: issues.length === 0,
      issues,
      stats
    };
  }
  // =========================================================================
  // Private methods
  // =========================================================================
  /**
   * Create a new browser instance
   */
  async createInstance() {
    const heroConfig = createHeroConfig({
      proxy: this.proxy,
      showChrome: this.showChrome,
      connectionToCore: this.connectionToCore,
      userAgent: this.userAgent
    });
    const hero = new Hero(heroConfig);
    return {
      hero,
      id: generateId(),
      createdAt: Date.now(),
      lastUsed: Date.now(),
      requestCount: 0,
      status: "idle"
    };
  }
  /**
   * Check if instance should be recycled
   */
  shouldRecycle(instance) {
    const age = Date.now() - instance.createdAt;
    return instance.requestCount >= this.config.retireAfterPageCount || age >= this.config.retireAfterAgeMs;
  }
  /**
   * Recycle an instance (close old, create new)
   */
  async recycleInstance(instance) {
    instance.status = "recycling";
    try {
      await instance.hero.close().catch(() => {
      });
      const newInstance = await this.createInstance();
      const index = this.instances.indexOf(instance);
      if (index !== -1) {
        this.instances[index] = newInstance;
      }
      this.available.push(newInstance);
      if (this.verbose) {
        this.logger.info(`Recycled browser: ${instance.id} \u2192 ${newInstance.id}`);
      }
      this.processQueue();
    } catch (error) {
      instance.status = "unhealthy";
      if (this.verbose) {
        this.logger.warn(`Failed to recycle browser ${instance.id}`);
      }
    }
  }
  /**
   * Queue a request when no browsers available
   */
  queueRequest() {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.config.maxQueueSize) {
        reject(new Error("Queue full"));
        return;
      }
      const item = {
        resolve,
        reject,
        queuedAt: Date.now()
      };
      this.queue.push(item);
      setTimeout(() => {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error("Queue timeout"));
        }
      }, this.config.queueTimeout);
    });
  }
  /**
   * Process queued requests
   */
  processQueue() {
    while (this.queue.length > 0 && this.available.length > 0) {
      const item = this.queue.shift();
      const age = Date.now() - item.queuedAt;
      if (age > this.config.queueTimeout) {
        item.reject(new Error("Queue timeout"));
        continue;
      }
      this.acquire().then(item.resolve).catch(item.reject);
    }
  }
  /**
   * Start background recycling task
   */
  startRecycling() {
    this.recycleTimer = setInterval(() => {
      for (const instance of this.instances) {
        if (instance.status === "idle" && this.shouldRecycle(instance)) {
          this.recycleInstance(instance).catch(() => {
          });
        }
      }
    }, this.config.recycleCheckInterval);
    this.recycleTimer.unref();
  }
  /**
   * Start background health checks
   */
  startHealthChecks() {
    this.healthTimer = setInterval(async () => {
      const health = await this.healthCheck();
      if (!health.healthy && health.issues.length > 0) {
        console.warn("[BrowserPool] Health issues:", health.issues);
      }
    }, this.config.healthCheckInterval);
    this.healthTimer.unref();
  }
};

// src/client.ts
var logger2 = createLogger("client");
var ReaderClient = class {
  heroCore = null;
  pool = null;
  initialized = false;
  initializing = null;
  closed = false;
  options;
  proxyIndex = 0;
  cleanupHandler = null;
  constructor(options = {}) {
    this.options = options;
    const skipTLS = options.skipTLSVerification ?? true;
    if (skipTLS) {
      process.env.MITM_ALLOW_INSECURE = "true";
    }
    this.registerCleanup();
  }
  /**
   * Get the next proxy from the rotation pool
   */
  getNextProxy() {
    const { proxies, proxyRotation = "round-robin" } = this.options;
    if (!proxies || proxies.length === 0) {
      return void 0;
    }
    if (proxyRotation === "random") {
      return proxies[Math.floor(Math.random() * proxies.length)];
    }
    const proxy = proxies[this.proxyIndex % proxies.length];
    this.proxyIndex++;
    return proxy;
  }
  /**
   * Initialize HeroCore. Called automatically on first scrape/crawl.
   * Can be called explicitly if you want to pre-warm the client.
   */
  async start() {
    if (this.closed) {
      throw new Error("ReaderClient has been closed. Create a new instance.");
    }
    if (this.initialized) {
      return;
    }
    if (this.initializing) {
      await this.initializing;
      return;
    }
    this.initializing = this.initializeCore();
    await this.initializing;
    this.initializing = null;
  }
  /**
   * Internal initialization logic
   */
  async initializeCore() {
    try {
      if (this.options.verbose) {
        logger2.info("Starting HeroCore...");
      }
      this.heroCore = new HeroCore();
      await this.heroCore.start();
      if (this.options.verbose) {
        logger2.info("HeroCore started successfully");
      }
      if (this.options.verbose) {
        logger2.info("Initializing browser pool...");
      }
      const browserPoolConfig = this.options.browserPool;
      const poolConfig = {
        size: browserPoolConfig?.size ?? 2,
        retireAfterPageCount: browserPoolConfig?.retireAfterPages ?? 100,
        retireAfterAgeMs: (browserPoolConfig?.retireAfterMinutes ?? 30) * 60 * 1e3,
        maxQueueSize: browserPoolConfig?.maxQueueSize ?? 100
      };
      this.pool = new BrowserPool(
        poolConfig,
        void 0,
        // proxy set per-request
        this.options.showChrome,
        this.createConnection(),
        void 0,
        // userAgent
        this.options.verbose
      );
      await this.pool.initialize();
      this.initialized = true;
      if (this.options.verbose) {
        logger2.info("Browser pool initialized successfully");
      }
    } catch (error) {
      if (this.pool) {
        await this.pool.shutdown().catch(() => {
        });
        this.pool = null;
      }
      if (this.heroCore) {
        await this.heroCore.close().catch(() => {
        });
        this.heroCore = null;
      }
      this.initialized = false;
      const message = error.message || String(error);
      if (message.includes("EADDRINUSE")) {
        throw new Error(
          "Failed to start HeroCore: Port already in use. Another instance may be running. Close it or use a different port."
        );
      }
      if (message.includes("chrome") || message.includes("Chrome")) {
        throw new Error(
          "Failed to start HeroCore: Chrome/Chromium not found. Please install Chrome or set CHROME_PATH environment variable."
        );
      }
      throw new Error(`Failed to start HeroCore: ${message}`);
    }
  }
  /**
   * Create a connection to the HeroCore instance
   */
  createConnection() {
    if (!this.heroCore) {
      throw new Error("HeroCore not initialized. This should not happen.");
    }
    const bridge = new TransportBridge();
    this.heroCore.addConnection(bridge.transportToClient);
    return new ConnectionToHeroCore(bridge.transportToCore);
  }
  /**
   * Ensure client is initialized before operation
   */
  async ensureInitialized() {
    if (this.closed) {
      throw new Error("ReaderClient has been closed. Create a new instance.");
    }
    if (!this.initialized) {
      await this.start();
    }
  }
  /**
   * Scrape one or more URLs
   *
   * @param options - Scrape options (urls, formats, etc.)
   * @returns Scrape result with data and metadata
   *
   * @example
   * const result = await reader.scrape({
   *   urls: ['https://example.com'],
   *   formats: ['markdown', 'html'],
   * });
   */
  async scrape(options) {
    await this.ensureInitialized();
    if (!this.pool) {
      throw new Error("Browser pool not initialized. This should not happen.");
    }
    const proxy = options.proxy ?? this.getNextProxy();
    return await scrape({
      ...options,
      proxy,
      showChrome: options.showChrome ?? this.options.showChrome,
      verbose: options.verbose ?? this.options.verbose,
      pool: this.pool
    });
  }
  /**
   * Crawl a website to discover URLs
   *
   * @param options - Crawl options (url, depth, maxPages, etc.)
   * @returns Crawl result with discovered URLs and optional scraped content
   *
   * @example
   * const result = await reader.crawl({
   *   url: 'https://example.com',
   *   depth: 2,
   *   maxPages: 50,
   *   scrape: true,
   * });
   */
  async crawl(options) {
    await this.ensureInitialized();
    if (!this.pool) {
      throw new Error("Browser pool not initialized. This should not happen.");
    }
    const proxy = options.proxy ?? this.getNextProxy();
    return await crawl({
      ...options,
      proxy,
      pool: this.pool
    });
  }
  /**
   * Check if the client is initialized and ready
   */
  isReady() {
    return this.initialized && !this.closed;
  }
  /**
   * Close the client and release resources
   *
   * Note: This is optional - the client will auto-close on process exit.
   */
  async close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.removeCleanupHandlers();
    if (this.pool) {
      if (this.options.verbose) {
        logger2.info("Shutting down browser pool...");
      }
      try {
        await this.pool.shutdown();
      } catch (error) {
        if (this.options.verbose) {
          logger2.warn(`Error shutting down pool: ${error.message}`);
        }
      }
      this.pool = null;
    }
    if (this.heroCore) {
      if (this.options.verbose) {
        logger2.info("Closing HeroCore...");
      }
      try {
        await this.heroCore.close();
        await HeroCore.shutdown();
      } catch (error) {
        if (this.options.verbose) {
          logger2.warn(`Error closing HeroCore: ${error.message}`);
        }
      }
      this.heroCore = null;
    }
    this.initialized = false;
    if (this.options.verbose) {
      logger2.info("ReaderClient closed");
    }
  }
  /**
   * Register cleanup handlers for process exit
   */
  registerCleanup() {
    this.cleanupHandler = async () => {
      await this.close();
    };
    process.once("beforeExit", this.cleanupHandler);
    process.once("SIGINT", async () => {
      await this.cleanupHandler?.();
      process.exit(0);
    });
    process.once("SIGTERM", async () => {
      await this.cleanupHandler?.();
      process.exit(0);
    });
  }
  /**
   * Remove process cleanup handlers
   */
  removeCleanupHandlers() {
    if (this.cleanupHandler) {
      process.removeListener("beforeExit", this.cleanupHandler);
      this.cleanupHandler = null;
    }
  }
};

// src/daemon/server.ts
import http from "http";
var logger3 = createLogger("daemon");
var DEFAULT_DAEMON_PORT = 3847;
var PID_FILE_NAME = ".reader-daemon.pid";
var DaemonServer = class {
  server = null;
  client = null;
  options;
  startTime = 0;
  constructor(options = {}) {
    this.options = {
      port: options.port ?? DEFAULT_DAEMON_PORT,
      poolSize: options.poolSize ?? 5,
      verbose: options.verbose ?? false,
      showChrome: options.showChrome ?? false
    };
  }
  /**
   * Start the daemon server
   */
  async start() {
    if (this.server) {
      throw new Error("Daemon is already running");
    }
    const clientOptions = {
      verbose: this.options.verbose,
      showChrome: this.options.showChrome,
      browserPool: {
        size: this.options.poolSize
      }
    };
    this.client = new ReaderClient(clientOptions);
    await this.client.start();
    this.server = http.createServer(this.handleRequest.bind(this));
    await new Promise((resolve, reject) => {
      this.server.listen(this.options.port, () => {
        this.startTime = Date.now();
        if (this.options.verbose) {
          logger3.info(`Daemon started on port ${this.options.port} with pool size ${this.options.poolSize}`);
        }
        resolve();
      });
      this.server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`Port ${this.options.port} is already in use. Is another daemon running?`));
        } else {
          reject(error);
        }
      });
    });
    await this.writePidFile();
  }
  /**
   * Stop the daemon server
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => resolve());
      });
      this.server = null;
    }
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    await this.removePidFile();
    if (this.options.verbose) {
      logger3.info("Daemon stopped");
    }
  }
  /**
   * Get the port the daemon is running on
   */
  getPort() {
    return this.options.port;
  }
  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    if (req.method !== "POST" || req.url !== "/") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Not found" }));
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }
    let request;
    try {
      request = JSON.parse(body);
    } catch {
      this.sendResponse(res, 400, { success: false, error: "Invalid JSON" });
      return;
    }
    try {
      switch (request.action) {
        case "scrape":
          await this.handleScrape(res, request.options);
          break;
        case "crawl":
          await this.handleCrawl(res, request.options);
          break;
        case "status":
          this.handleStatus(res);
          break;
        case "shutdown":
          await this.handleShutdown(res);
          break;
        default:
          this.sendResponse(res, 400, { success: false, error: "Unknown action" });
      }
    } catch (error) {
      this.sendResponse(res, 500, { success: false, error: error.message });
    }
  }
  /**
   * Handle scrape request
   */
  async handleScrape(res, options) {
    if (!this.client) {
      this.sendResponse(res, 500, { success: false, error: "Client not initialized" });
      return;
    }
    const result = await this.client.scrape(options);
    this.sendResponse(res, 200, { success: true, data: result });
  }
  /**
   * Handle crawl request
   */
  async handleCrawl(res, options) {
    if (!this.client) {
      this.sendResponse(res, 500, { success: false, error: "Client not initialized" });
      return;
    }
    const result = await this.client.crawl(options);
    this.sendResponse(res, 200, { success: true, data: result });
  }
  /**
   * Handle status request
   */
  handleStatus(res) {
    const status = {
      running: true,
      port: this.options.port,
      poolSize: this.options.poolSize,
      uptime: Date.now() - this.startTime,
      pid: process.pid
    };
    this.sendResponse(res, 200, { success: true, data: status });
  }
  /**
   * Handle shutdown request
   */
  async handleShutdown(res) {
    this.sendResponse(res, 200, { success: true, data: { message: "Shutting down" } });
    setTimeout(() => {
      this.stop().then(() => process.exit(0));
    }, 100);
  }
  /**
   * Send JSON response
   */
  sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }
  /**
   * Write PID file
   */
  async writePidFile() {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const pidFile = path.join(os.tmpdir(), PID_FILE_NAME);
    const data = JSON.stringify({
      pid: process.pid,
      port: this.options.port,
      startedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await fs.writeFile(pidFile, data);
  }
  /**
   * Remove PID file
   */
  async removePidFile() {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    const pidFile = path.join(os.tmpdir(), PID_FILE_NAME);
    try {
      await fs.unlink(pidFile);
    } catch {
    }
  }
};
async function getPidFilePath() {
  const path = await import("path");
  const os = await import("os");
  return path.join(os.tmpdir(), PID_FILE_NAME);
}
async function getDaemonInfo() {
  const fs = await import("fs/promises");
  const pidFile = await getPidFilePath();
  try {
    const data = await fs.readFile(pidFile, "utf-8");
    const info = JSON.parse(data);
    try {
      process.kill(info.pid, 0);
      return info;
    } catch {
      await fs.unlink(pidFile).catch(() => {
      });
      return null;
    }
  } catch {
    return null;
  }
}

// src/daemon/client.ts
import http2 from "http";
var DaemonClient = class {
  options;
  constructor(options = {}) {
    this.options = {
      port: options.port ?? DEFAULT_DAEMON_PORT,
      timeoutMs: options.timeoutMs ?? 6e5
      // 10 minutes default
    };
  }
  /**
   * Scrape URLs via daemon
   */
  async scrape(options) {
    return this.request({
      action: "scrape",
      options
    });
  }
  /**
   * Crawl URL via daemon
   */
  async crawl(options) {
    return this.request({
      action: "crawl",
      options
    });
  }
  /**
   * Get daemon status
   */
  async status() {
    return this.request({
      action: "status"
    });
  }
  /**
   * Request daemon shutdown
   */
  async shutdown() {
    await this.request({
      action: "shutdown"
    });
  }
  /**
   * Check if daemon is reachable
   */
  async isRunning() {
    try {
      await this.status();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Make HTTP request to daemon
   */
  request(body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http2.request(
        {
          hostname: "127.0.0.1",
          port: this.options.port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data)
          },
          timeout: this.options.timeoutMs
        },
        (res) => {
          let responseBody = "";
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () => {
            try {
              const response = JSON.parse(responseBody);
              if (response.success) {
                resolve(response.data);
              } else {
                reject(new Error(response.error || "Unknown daemon error"));
              }
            } catch (error) {
              reject(new Error(`Failed to parse daemon response: ${responseBody}`));
            }
          });
        }
      );
      req.on("error", (error) => {
        if (error.code === "ECONNREFUSED") {
          reject(new Error(`Cannot connect to daemon on port ${this.options.port}. Is it running?`));
        } else {
          reject(error);
        }
      });
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Request to daemon timed out after ${this.options.timeoutMs}ms`));
      });
      req.write(data);
      req.end();
    });
  }
};
async function isDaemonRunning(port = DEFAULT_DAEMON_PORT) {
  const client = new DaemonClient({ port, timeoutMs: 5e3 });
  return client.isRunning();
}

// src/cli/index.ts
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var __dirname = dirname(fileURLToPath(import.meta.url));
var pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
var program = new Command();
program.name("reader").description(
  "Production-grade web scraping engine for LLMs. Clean markdown output, ready for your agents."
).version(pkg.version);
program.command("start").description("Start the reader daemon server").option("-p, --port <n>", `Port to listen on (default: ${DEFAULT_DAEMON_PORT})`, String(DEFAULT_DAEMON_PORT)).option("--pool-size <n>", "Browser pool size", "5").option("--show-chrome", "Show browser windows for debugging").option("-v, --verbose", "Enable verbose logging").action(async (options) => {
  const port = parseInt(options.port, 10);
  if (await isDaemonRunning(port)) {
    console.error(`Error: Daemon is already running on port ${port}`);
    process.exit(1);
  }
  const daemon = new DaemonServer({
    port,
    poolSize: parseInt(options.poolSize, 10),
    verbose: options.verbose || false,
    showChrome: options.showChrome || false
  });
  try {
    await daemon.start();
    console.log(`Reader daemon started on port ${port} with pool size ${options.poolSize}`);
    console.log(`Use "npx reader stop" to stop the daemon`);
    process.on("SIGINT", async () => {
      console.log("\nShutting down daemon...");
      await daemon.stop();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await daemon.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
});
program.command("stop").description("Stop the running reader daemon").option("-p, --port <n>", `Daemon port (default: ${DEFAULT_DAEMON_PORT})`, String(DEFAULT_DAEMON_PORT)).action(async (options) => {
  const port = parseInt(options.port, 10);
  const client = new DaemonClient({ port });
  try {
    if (!await client.isRunning()) {
      console.log("Daemon is not running");
      return;
    }
    await client.shutdown();
    console.log("Daemon stopped");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
});
program.command("status").description("Check daemon status").option("-p, --port <n>", `Daemon port (default: ${DEFAULT_DAEMON_PORT})`, String(DEFAULT_DAEMON_PORT)).action(async (options) => {
  const daemonInfo = await getDaemonInfo();
  if (!daemonInfo) {
    console.log("Daemon is not running");
    return;
  }
  const port = options.port ? parseInt(options.port, 10) : daemonInfo.port;
  const client = new DaemonClient({ port });
  try {
    const status = await client.status();
    console.log("Daemon is running:");
    console.log(`  Port: ${status.port}`);
    console.log(`  PID: ${status.pid}`);
    console.log(`  Pool size: ${status.poolSize}`);
    console.log(`  Uptime: ${Math.round(status.uptime / 1e3)}s`);
  } catch {
    console.log("Daemon is not running (stale PID file)");
  }
});
program.command("scrape <urls...>").description("Scrape one or more URLs").option(
  "-f, --format <formats>",
  "Content formats to include (comma-separated: markdown,html)",
  "markdown"
).option("-o, --output <file>", "Output file (stdout if omitted)").option("-c, --concurrency <n>", "Parallel requests", "1").option("-t, --timeout <ms>", "Request timeout in milliseconds", "30000").option("--proxy <url>", "Proxy URL (e.g., http://user:pass@host:port)").option("--user-agent <string>", "Custom user agent string").option("--batch-timeout <ms>", "Total timeout for entire batch operation", "300000").option("--show-chrome", "Show browser window for debugging").option("--standalone", "Force standalone mode (bypass daemon)").option("-p, --port <n>", `Daemon port (default: ${DEFAULT_DAEMON_PORT})`, String(DEFAULT_DAEMON_PORT)).option("-v, --verbose", "Enable verbose logging").option("--no-main-content", "Disable main content extraction (include full page)").option("--include-tags <selectors>", "CSS selectors for elements to include (comma-separated)").option("--exclude-tags <selectors>", "CSS selectors for elements to exclude (comma-separated)").option("--engine <name>", "Force a specific engine (http, tlsclient, hero)").option("--skip-engine <names>", "Skip specific engines (comma-separated: http,tlsclient,hero)").action(async (urls, options) => {
  const port = parseInt(options.port, 10);
  const useStandalone = options.standalone || false;
  let useDaemon = false;
  if (!useStandalone) {
    useDaemon = await isDaemonRunning(port);
    if (options.verbose && useDaemon) {
      console.error(`Using daemon on port ${port}`);
    }
  }
  const daemonClient = useDaemon ? new DaemonClient({ port }) : null;
  const standaloneClient = !useDaemon ? new ReaderClient({
    verbose: options.verbose || false,
    showChrome: options.showChrome || false
  }) : null;
  try {
    const formats = options.format.split(",").map((f) => f.trim());
    const validFormats = ["markdown", "html"];
    for (const format of formats) {
      if (!validFormats.includes(format)) {
        console.error(
          `Error: Invalid format "${format}". Valid formats: ${validFormats.join(", ")}`
        );
        process.exit(1);
      }
    }
    if (options.verbose) {
      console.error(`Scraping ${urls.length} URL(s)...`);
      console.error(`Formats: ${formats.join(", ")}`);
    }
    const includeTags = options.includeTags ? options.includeTags.split(",").map((s) => s.trim()) : void 0;
    const excludeTags = options.excludeTags ? options.excludeTags.split(",").map((s) => s.trim()) : void 0;
    const skipEngines = options.skipEngine ? options.skipEngine.split(",").map((s) => s.trim()) : void 0;
    const scrapeOptions = {
      urls,
      formats,
      batchConcurrency: parseInt(options.concurrency, 10),
      timeoutMs: parseInt(options.timeout, 10),
      batchTimeoutMs: parseInt(options.batchTimeout, 10),
      proxy: options.proxy ? { url: options.proxy } : void 0,
      userAgent: options.userAgent,
      verbose: options.verbose || false,
      showChrome: options.showChrome || false,
      // Content cleaning options
      onlyMainContent: options.mainContent !== false,
      // --no-main-content sets this to false
      includeTags,
      excludeTags,
      // Engine options
      forceEngine: options.engine,
      skipEngines,
      onProgress: options.verbose ? ({ completed, total, currentUrl }) => {
        console.error(`[${completed}/${total}] ${currentUrl}`);
      } : void 0
    };
    const result = useDaemon ? await daemonClient.scrape(scrapeOptions) : await standaloneClient.scrape(scrapeOptions);
    const output = JSON.stringify(result, null, 2);
    if (options.output) {
      writeFileSync(options.output, output);
      if (options.verbose) {
        console.error(`Output written to ${options.output}`);
      }
    } else {
      console.log(output);
    }
    if (options.verbose) {
      console.error(`
Summary:`);
      console.error(
        `  Successful: ${result.batchMetadata.successfulUrls}/${result.batchMetadata.totalUrls}`
      );
      console.error(`  Duration: ${result.batchMetadata.totalDuration}ms`);
    }
    if (result.batchMetadata.failedUrls > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (standaloneClient) {
      await standaloneClient.close();
      process.exit(0);
    }
  }
});
program.command("crawl <url>").description("Crawl a website to discover and optionally scrape pages").option("-d, --depth <n>", "Maximum crawl depth", "1").option("-m, --max-pages <n>", "Maximum pages to discover", "20").option("-s, --scrape", "Also scrape content of discovered pages").option("-f, --format <formats>", "Content formats when scraping (comma-separated: markdown,html)", "markdown").option("-o, --output <file>", "Output file (stdout if omitted)").option("--delay <ms>", "Delay between requests in milliseconds", "1000").option("-t, --timeout <ms>", "Total timeout for crawl operation in milliseconds").option("--include <patterns>", "URL patterns to include (comma-separated regex)").option("--exclude <patterns>", "URL patterns to exclude (comma-separated regex)").option("--proxy <url>", "Proxy URL (e.g., http://user:pass@host:port)").option("--user-agent <string>", "Custom user agent string").option("--show-chrome", "Show browser window for debugging").option("--standalone", "Force standalone mode (bypass daemon)").option("-p, --port <n>", `Daemon port (default: ${DEFAULT_DAEMON_PORT})`, String(DEFAULT_DAEMON_PORT)).option("-v, --verbose", "Enable verbose logging").action(async (url, options) => {
  const port = parseInt(options.port, 10);
  const useStandalone = options.standalone || false;
  let useDaemon = false;
  if (!useStandalone) {
    useDaemon = await isDaemonRunning(port);
    if (options.verbose && useDaemon) {
      console.error(`Using daemon on port ${port}`);
    }
  }
  const daemonClient = useDaemon ? new DaemonClient({ port }) : null;
  const standaloneClient = !useDaemon ? new ReaderClient({
    verbose: options.verbose || false,
    showChrome: options.showChrome || false
  }) : null;
  try {
    if (options.verbose) {
      console.error(`Crawling ${url}...`);
      console.error(`Max depth: ${options.depth}, Max pages: ${options.maxPages}`);
    }
    const includePatterns = options.include ? options.include.split(",").map((p) => p.trim()) : void 0;
    const excludePatterns = options.exclude ? options.exclude.split(",").map((p) => p.trim()) : void 0;
    const crawlOptions = {
      url,
      depth: parseInt(options.depth, 10),
      maxPages: parseInt(options.maxPages, 10),
      scrape: options.scrape || false,
      delayMs: parseInt(options.delay, 10),
      timeoutMs: options.timeout ? parseInt(options.timeout, 10) : void 0,
      includePatterns,
      excludePatterns,
      proxy: options.proxy ? { url: options.proxy } : void 0,
      userAgent: options.userAgent,
      verbose: options.verbose || false,
      showChrome: options.showChrome || false
    };
    const formats = options.format.split(",").map((f) => f.trim());
    const crawlOptionsWithFormats = {
      ...crawlOptions,
      formats
    };
    const result = useDaemon ? await daemonClient.crawl(crawlOptionsWithFormats) : await standaloneClient.crawl(crawlOptionsWithFormats);
    const output = JSON.stringify(result, null, 2);
    if (options.output) {
      writeFileSync(options.output, output);
      if (options.verbose) {
        console.error(`Output written to ${options.output}`);
      }
    } else {
      console.log(output);
    }
    if (options.verbose) {
      console.error(`
Summary:`);
      console.error(`  Discovered: ${result.urls.length} URLs`);
      console.error(`  Duration: ${result.metadata.totalDuration}ms`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (standaloneClient) {
      await standaloneClient.close();
      process.exit(0);
    }
  }
});
program.parse();
//# sourceMappingURL=index.js.map