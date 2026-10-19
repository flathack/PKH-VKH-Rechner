import type { HtmlTagDescriptor, Plugin } from "vite";
import {
  PUBLIC_SITE_URL,
  PUBLIC_SITEMAP_URL,
  SEO_DESCRIPTION,
  SEO_HEADING,
  SEO_INTRO,
  SEO_PRIVACY_NOTE,
  SEO_STRUCTURED_DATA_JSON,
  SEO_TITLE,
  ZPO_SECTION_115_URL,
  PUBLIC_SOCIAL_IMAGE_URL,
  SEO_FAQ,
  SEO_INFO_INTRO,
  SEO_INFO_TITLE,
  RELEASES_URL,
} from "../app/seo-metadata";
import { BRAND_ICON_DATA_URL } from "../app/branding.mjs";
import { THEME_INIT_SCRIPT } from "../app/theme.mjs";

interface SeoMetadataPluginOptions {
  publicSite: boolean;
}

const PLACEHOLDERS = new Map([
  ["__SEO_TITLE__", SEO_TITLE],
  ["__SEO_DESCRIPTION__", SEO_DESCRIPTION],
  ["__SEO_HEADING__", SEO_HEADING],
  ["__SEO_INTRO__", SEO_INTRO],
  ["__SEO_PRIVACY_NOTE__", SEO_PRIVACY_NOTE],
  ["__SEO_ZPO_URL__", ZPO_SECTION_115_URL],
  ["__SEO_INFO__", infoHtml()],
]);

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function infoHtml(): string {
  return `<section class="calculator-info" aria-labelledby="calculator-info-title"><div class="info-intro"><span class="eyebrow">Zum Rechner</span><h2 id="calculator-info-title">${escapeHtml(SEO_INFO_TITLE)}</h2><p>${escapeHtml(SEO_INFO_INTRO)}</p><a class="download-link" href="${RELEASES_URL}">Offline-Version herunterladen ↗</a></div><div class="faq-list">${SEO_FAQ.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join("")}</div></section>`;
}

function replaceSeoPlaceholders(html: string): string {
  let transformed = html;

  for (const [placeholder, value] of PLACEHOLDERS) {
    transformed = transformed.replaceAll(placeholder, value);
  }

  const unresolved = transformed.match(/__SEO_[A-Z_]+__/g);
  if (unresolved) {
    throw new Error(`Nicht aufgelöste SEO-Platzhalter: ${[...new Set(unresolved)].join(", ")}`);
  }

  return transformed;
}

function publicMetadataTags(): HtmlTagDescriptor[] {
  return [
    { tag: "link", attrs: { rel: "canonical", href: PUBLIC_SITE_URL }, injectTo: "head" },
    { tag: "link", attrs: { rel: "sitemap", type: "application/xml", href: PUBLIC_SITEMAP_URL }, injectTo: "head" },
    { tag: "meta", attrs: { name: "robots", content: "index, follow" }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:type", content: "website" }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:locale", content: "de_DE" }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:title", content: SEO_TITLE }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:description", content: SEO_DESCRIPTION }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:url", content: PUBLIC_SITE_URL }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:image", content: PUBLIC_SOCIAL_IMAGE_URL }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:image:width", content: "1200" }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:image:height", content: "630" }, injectTo: "head" },
    { tag: "meta", attrs: { property: "og:image:alt", content: "PKH · VKH Ratenrechner – Einkommen, Unterhalt, Wohn- und Fahrtkosten" }, injectTo: "head" },
    { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" }, injectTo: "head" },
    { tag: "meta", attrs: { name: "twitter:image", content: PUBLIC_SOCIAL_IMAGE_URL }, injectTo: "head" },
    { tag: "meta", attrs: { name: "twitter:title", content: SEO_TITLE }, injectTo: "head" },
    { tag: "meta", attrs: { name: "twitter:description", content: SEO_DESCRIPTION }, injectTo: "head" },
    {
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: SEO_STRUCTURED_DATA_JSON,
      injectTo: "head",
    },
  ];
}

function sitemapXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${PUBLIC_SITE_URL}</loc>`,
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

export function createSeoMetadataPlugin({ publicSite }: SeoMetadataPluginOptions): Plugin {
  return {
    name: "pkh-vkh-seo-metadata",
    transformIndexHtml(html) {
      const transformed = replaceSeoPlaceholders(html);
      return {
        html: transformed,
        tags: [
          { tag: "script", attrs: { "data-theme-init": true }, children: THEME_INIT_SCRIPT, injectTo: "head" },
          { tag: "link", attrs: { rel: "icon", type: "image/svg+xml", href: publicSite ? "./favicon.svg" : BRAND_ICON_DATA_URL }, injectTo: "head" },
          ...(publicSite ? [
            ...publicMetadataTags(),
            { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "48x48", href: "./favicon-48.png" }, injectTo: "head" as const },
            { tag: "link", attrs: { rel: "apple-touch-icon", sizes: "180x180", href: "./apple-touch-icon.png" }, injectTo: "head" as const },
            { tag: "link", attrs: { rel: "manifest", href: "./site.webmanifest" }, injectTo: "head" as const },
          ] : []),
        ],
      };
    },
    generateBundle() {
      if (publicSite) {
        this.emitFile({ type: "asset", fileName: "site.webmanifest", source: JSON.stringify({ name: "PKH · VKH Ratenrechner", short_name: "PKH · VKH", lang: "de", start_url: "./", scope: "./", display: "standalone", theme_color: "#f3f6f5", background_color: "#f3f6f5", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }] }) });
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: sitemapXml(),
        });
      }
    },
  };
}
