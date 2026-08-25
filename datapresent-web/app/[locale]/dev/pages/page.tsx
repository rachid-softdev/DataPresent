"use client";

import { notFound } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
}

function EmailPreview({ template }: { template: EmailTemplate }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && template.html) {
      // Set srcdoc via ref to avoid hydration mismatch (HTML contains &, ", <, >)
      iframe.srcdoc = template.html;
    }
  }, [template.html]);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      {/* Header with template name and subject */}
      <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{template.subject}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          email
        </span>
      </div>

      {/* Rendered email in iframe */}
      <div className="bg-[#f1f8ec]">
        <iframe
          ref={iframeRef}
          title={`${template.name} preview`}
          className="w-full border-0"
          style={{ minHeight: 420, height: "auto" }}
          sandbox="allow-same-origin"
          loading="lazy"
          onLoad={(e) => {
            const iframe = e.currentTarget;
            try {
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (doc) {
                const height = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 420;
                iframe.style.height = `${height}px`;
              }
            } catch {
              // Cross-origin restrictions may apply
            }
          }}
        />
      </div>
    </div>
  );
}

function PagePreview({ title, url }: { title: string; url: string }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{url}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          iframe
        </span>
      </div>
      <div className="bg-muted/50">
        <iframe
          src={url}
          title={title}
          className="w-full border-0 bg-surface"
          style={{ minHeight: 420, height: "auto" }}
          loading="lazy"
          onLoad={(e) => {
            const iframe = e.currentTarget;
            try {
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (doc) {
                const height = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 420;
                iframe.style.height = `${height}px`;
              }
            } catch {
              // Cross-origin restrictions may apply
            }
          }}
        />
      </div>
    </div>
  );
}

function LoadingPreview() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Loading (spinner)</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">components/ui/spinner</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          direct
        </span>
      </div>
      <div className="flex min-h-[200px] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeletonPreview() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dashboard skeleton</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">(dashboard)/loading</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          direct
        </span>
      </div>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="w-48 h-8 bg-muted animate-pulse rounded" />
          <div className="w-32 h-10 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="border border-border rounded-lg p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 bg-muted rounded" />
                  <div className="w-24 h-5 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DevPagesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  useEffect(() => {
    fetch("/api/dev/email-preview")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => {});
  }, []);

  const pages = [
    {
      title: "404 \u2014 Page not found",
      url: "/dev/404-preview",
    },
    {
      title: "Application error (_error)",
      url: "/dev/pages/error",
    },
    {
      title: "Global error (global-error)",
      url: "/dev/pages/global-error",
    },
    {
      title: "Loading (loading)",
      url: "/dev/pages/loading",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header hideAuth />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-md uppercase tracking-wider">
                Dev Only
              </span>
              <h1 className="app-heading app-heading-xl">Dev Pages</h1>
            </div>
            <p className="text-muted-foreground">
              All dev-only pages: email template previews, application state pages, and loading
              states.
            </p>
          </div>

          {/* Email templates */}
          {templates.length > 0 && (
            <section className="mb-16">
              <h2 className="text-xl font-semibold text-foreground mb-2">Email Templates</h2>
              <p className="text-muted-foreground mb-6">
                {templates.length} templates rendered in sandboxed iframes.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {templates.map((tpl) => (
                  <EmailPreview key={tpl.name} template={tpl} />
                ))}
              </div>
            </section>
          )}

          {/* State pages */}
          <section className="mb-16">
            <h2 className="text-xl font-semibold text-foreground mb-2">State Pages</h2>
            <p className="text-muted-foreground mb-6">
              Application state pages (errors, 404, loading), rendered in iframes or directly.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {pages.map((page) => (
                <PagePreview key={page.url} title={page.title} url={page.url} />
              ))}

              {/* Loading — direct render (no route) */}
              <LoadingPreview />

              {/* Dashboard skeleton — direct render */}
              <DashboardSkeletonPreview />
            </div>
          </section>

          {/* Technical details */}
          <section className="border-t border-border pt-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Technical Details</h2>
            <div className="bg-surface rounded-xl border border-border p-6 text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">Layout:</span> Header + Footer
                (standard app chrome). No auth required.
              </p>
              <p>
                <span className="font-medium text-foreground">Email templates:</span> 2 templates
                (magic-link, welcome) loaded server-side via{" "}
                <code className="text-xs bg-muted px-1 rounded">lib/email-templates/</code>,
                previewed via <code className="text-xs bg-muted px-1 rounded">srcDoc</code> iframes.
              </p>
              <p>
                <span className="font-medium text-foreground">Security:</span> Blocked in production
                by proxy rewrite, <code className="text-xs bg-muted px-1 rounded">notFound()</code>{" "}
                guard, and <code className="text-xs bg-muted px-1 rounded">robots.txt</code>{" "}
                disallow.
              </p>
              <p>
                <span className="font-medium text-foreground">Files:</span>{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  app/[locale]/dev/pages/page.tsx
                </code>{" "}
                (hub),
                <code className="text-xs bg-muted px-1 rounded ml-1">
                  app/api/dev/email-preview/route.ts
                </code>{" "}
                (API).
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
