import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'DataPresent'
  const description = searchParams.get('description') || 'Transformez vos données en présentations percutantes avec l\'IA'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundColor: '#f1f8ec',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(135deg, #d4e8c4 0%, transparent 50%)',
            opacity: 0.5,
          }}
        />

        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#0c1407',
          }}
        >
          DataPresent
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '800px',
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? '42' : '56',
              fontWeight: 'bold',
              color: '#0c1407',
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '24',
              color: '#3d5a32',
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '20',
            color: '#6b7c5c',
          }}
        >
          datapresent.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: await fetch(new URL('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2')).then(res => res.arrayBuffer()),
        },
      ],
    }
  )
}