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
} from "../app/seo-metadata";

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
]);

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
    { tag: "meta", attrs: { name: "twitter:card", content: "summary" }, injectTo: "head" },
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
      if (!publicSite) {
        return transformed;
      }

      return {
        html: transformed,
        tags: publicMetadataTags(),
      };
    },
    generateBundle() {
      if (publicSite) {
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: sitemapXml(),
        });
      }
    },
  };
}
