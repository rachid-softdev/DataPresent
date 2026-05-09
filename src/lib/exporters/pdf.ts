export async function generatePdf(params: {
  title: string
  slides: Array<{
    title: string
    layout: string
    content: Record<string, unknown>
  }>
}): Promise<Buffer> {
  const html = generateHtmlFromSlides(params)
  
  let puppeteer
  try {
    puppeteer = await import('puppeteer-core')
  } catch {
    // Fallback: generate a basic PDF via simple HTML
    // This is not a real PDF but avoids returning HTML as binary
    const simpleHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${params.title}</title></head><body><h1>${params.title}</h1><p>PDF generation requires puppeteer. Please install puppeteer-core.</p></body></html>`
    return Buffer.from(simpleHtml, 'utf-8')
  }

  const isVercel = process.env.VERCEL === '1'
  
  let executablePath: string | undefined
  if (isVercel) {
    const chromium = await import('@sparticuz/chromium').catch(() => null)
    if (chromium) {
      executablePath = await chromium.default.executablePath()
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    protocolTimeout: 60000,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
    })
    
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function generateHtmlFromSlides(params: {
  title: string
  slides: Array<{
    title: string
    layout: string
    content: Record<string, unknown>
  }>
}): string {
  const slidesHtml = params.slides.map(slide => `
    <div class="slide">
      <h1>${slide.title}</h1>
      <pre>${JSON.stringify(slide.content, null, 2)}</pre>
    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${params.title}</title>
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
  `
}

export { generateHtmlFromSlides }