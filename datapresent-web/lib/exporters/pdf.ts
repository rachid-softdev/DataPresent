// ==========================================
// PDF Export — Inline generation (legacy path)
//
// MIGRATION PATH (Horizon 6 — PDF Service Dédié):
//   Phase 1: Add placeholder worker (done — see workers/src/workers/pdf.worker.ts)
//   Phase 2: Move puppeteer/chromium dependency to dedicated worker service
//   Phase 3: Replace inline generatePdf() with BullMQ job enqueue:
//     import { getExportQueue } from "@/lib/queue";
//     const queue = await getExportQueue();
//     await queue.add("pdf-export", {
//       exportId,
//       reportId,
//       userId,
//       slides: [...],
//       signature: signedPayload,
//     });
//   Phase 4: Remove puppeteer-core and @sparticuz/chromium from web dependencies
// ==========================================

let browserPromise: Promise<import("puppeteer-core").Browser> | null = null;

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  if (!browserPromise) {
    const puppeteer = await import("puppeteer-core");
    const isVercel = process.env.VERCEL === "1";
    let executablePath: string | undefined;
    if (isVercel) {
      const chromium = await import("@sparticuz/chromium").catch(() => null);
      if (chromium) {
        executablePath = await chromium.default.executablePath();
      }
    }
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      protocolTimeout: 60000,
    });
  }
  return browserPromise;
}

export async function generatePdf(params: {
  title: string;
  slides: Array<{
    title: string;
    layout: string;
    content: Record<string, unknown>;
  }>;
}): Promise<Buffer> {
  const html = generateHtmlFromSlides(params);

  // Verify puppeteer-core is available before proceeding
  try {
    await import("puppeteer-core");
  } catch {
    throw new Error(
      "PDF generation requires puppeteer-core. " +
        "Install it with: npm install puppeteer-core\n" +
        "For Vercel deployments, @sparticuz/chromium is also needed.",
    );
  }

  const browser = await getBrowser();
  let page: import("puppeteer-core").Page | null = null;

  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (page) await page.close();
  }
}

/**
 * Escape HTML special characters to prevent XSS.
 * Escapes: & < > " '
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function generateHtmlFromSlides(params: {
  title: string;
  slides: Array<{
    title: string;
    layout: string;
    content: Record<string, unknown>;
  }>;
}): string {
  const slidesHtml = params.slides
    .map(
      (slide) => `
    <div class="slide">
      <h1>${escapeHtml(slide.title)}</h1>
      <pre>${escapeHtml(JSON.stringify(slide.content, null, 2))}</pre>
    </div>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(params.title)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .slide { page-break-after: always; margin-bottom: 40px; }
        h1 { color: #1a1a2e; }
        pre { background: #f5f5f5; padding: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      ${slidesHtml}
    </body>
    </html>
  `;
}

export { generateHtmlFromSlides };
