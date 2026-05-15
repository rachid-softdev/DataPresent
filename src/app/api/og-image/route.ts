import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const title = searchParams.get('title') || 'DataPresent'
  const description = searchParams.get('description') || 'Transform your data into professional presentations with AI'
  const locale = searchParams.get('locale') || 'en'
  const type = searchParams.get('type') || 'default' // 'default', 'report', 'blog'

  try {
    const image = generateOgImage({ title, description, locale, type })
    return new Response(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('OG Image generation error:', error)
    return new NextResponse('Failed to generate image', { status: 500 })
  }
}

function generateOgImage(params: {
  title: string
  description: string
  locale: string
  type: string
}): Buffer {
  // Create an ImageResponse with the design
  const response = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f1f8ec',
          padding: '60px',
        },
        children: [
          // Logo/Brand
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '40px',
                left: '60px',
                fontSize: '28px',
                fontWeight: '700',
                color: '#0c1407',
                fontFamily: 'system-ui',
              },
              children: 'DataPresent',
            },
          },
          // Main content
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flex: 1,
                maxWidth: '800px',
              },
              children: [
                // Type badge
                params.type !== 'default' && {
                  type: 'div',
                  props: {
                    style: {
                      display: 'inline-flex',
                      padding: '8px 16px',
                      backgroundColor: params.type === 'report' ? '#4f46e5' : '#22c55e',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '20px',
                      width: 'fit-content',
                    },
                    children: params.type === 'report' ? 'Report' : 'Blog Post',
                  },
                },
                // Title
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: params.title.length > 50 ? '36px' : '48px',
                      fontWeight: '700',
                      color: '#0c1407',
                      lineHeight: 1.2,
                      marginBottom: '16px',
                      fontFamily: 'system-ui',
                    },
                    children: params.title,
                  },
                },
                // Description
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '20px',
                      color: '#3d5a32',
                      lineHeight: 1.5,
                      fontFamily: 'system-ui',
                    },
                    children: params.description,
                  },
                },
              ],
            },
          },
          // URL
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '40px',
                right: '60px',
                fontSize: '16px',
                color: '#6b7c5c',
                fontFamily: 'system-ui',
              },
              children: `datapresent.com/${params.locale}${params.type === 'blog' ? '/blog' : ''}`,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
    }
  )

  // ImageResponse returns a Blob, we need to convert to Buffer
  return Buffer.from((response as any).body as ArrayBuffer)
}