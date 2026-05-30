import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawTitle = searchParams.get('title') || 'DataPresent Blog'
  const rawDescription = searchParams.get('description') || 'Latest news, tips and insights about data presentation'
  const rawSlug = searchParams.get('slug') || ''
  const locale = searchParams.get('locale') || 'en'

  // Validate input lengths before truncation to prevent DoS
  if (rawTitle.length > 200) {
    return new Response('Title too long', { status: 400 })
  }
  if (rawDescription.length > 500) {
    return new Response('Description too long', { status: 400 })
  }
  if (rawSlug.length > 100) {
    return new Response('Slug too long', { status: 400 })
  }

  const title = rawTitle.slice(0, 100)
  const description = rawDescription.slice(0, 300)
  const slug = rawSlug.slice(0, 100)

  // HTML template for OG image
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #f1f8ec 0%, #d4e8c4 100%);
      display: flex;
      flex-direction: column;
      padding: 60px;
      position: relative;
    }
    .logo {
      position: absolute;
      top: 40px;
      left: 60px;
      font-size: 28px;
      font-weight: 700;
      color: #0c1407;
    }
    .content {
      margin-top: auto;
      max-width: 800px;
    }
    .title {
      font-size: ${title.length > 50 ? '36' : '48'}px;
      font-weight: 700;
      color: #0c1407;
      margin-bottom: 16px;
      line-height: 1.2;
    }
    .description {
      font-size: 20px;
      color: #3d5a32;
      line-height: 1.5;
    }
    .url {
      position: absolute;
      bottom: 40px;
      right: 60px;
      font-size: 16px;
      color: #6b7c5c;
    }
  </style>
</head>
<body>
  <div class="logo">DataPresent</div>
  <div class="content">
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="description">${escapeHtml(description)}</p>
  </div>
  <div class="url">datapresent.com/${escapeHtml(locale)}/blog/${escapeHtml(slug)}</div>
</body>
</html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}