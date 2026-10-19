import type { Metadata, Viewport } from "next";
import "./design/flathack/tokens.css";
import "./design/flathack/base.css";
import "./globals.css";
import {
  PUBLIC_SITE_URL,
  PUBLIC_SITEMAP_URL,
  PUBLIC_ICON_URL,
  PUBLIC_SOCIAL_IMAGE_URL,
  SEO_DESCRIPTION,
  SEO_STRUCTURED_DATA_JSON,
  SEO_TITLE,
} from "./seo-metadata";
import { THEME_INIT_SCRIPT } from "./theme.mjs";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  icons: { icon: [{ url: PUBLIC_ICON_URL, type: "image/svg+xml" }, { url: new URL("favicon-48.png", PUBLIC_SITE_URL).href, sizes: "48x48", type: "image/png" }], apple: new URL("apple-touch-icon.png", PUBLIC_SITE_URL).href },
  manifest: new URL("site.webmanifest", PUBLIC_SITE_URL).href,
  alternates: {
    canonical: PUBLIC_SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: PUBLIC_SITE_URL,
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [{ url: PUBLIC_SOCIAL_IMAGE_URL, width: 1200, height: 630, alt: "PKH · VKH Ratenrechner – Einkommen, Unterhalt, Wohn- und Fahrtkosten" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [PUBLIC_SOCIAL_IMAGE_URL],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-theme="classic" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f3f6f5" />
        <script data-theme-init dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="sitemap" type="application/xml" href={PUBLIC_SITEMAP_URL} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO_STRUCTURED_DATA_JSON }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
