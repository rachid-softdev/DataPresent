import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('reportId')

  if (!reportId) {
    return NextResponse.json({ error: 'Report ID required' }, { status: 400 })
  }

  // Verify user has access to this report
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              reports: { where: { id: reportId } }
            }
          }
        }
      }
    }
  })

  const hasAccess = user?.membership.some(m => 
    m.org.reports.some(r => r.id === reportId)
  )

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Initial status
      sendEvent('status', { status: 'processing', progress: 0 })

      // Poll the database for status changes
      let lastStatus = ''
      const pollInterval = setInterval(async () => {
        try {
          const report = await prisma.report.findUnique({
            where: { id: reportId },
            select: { status: true, updatedAt: true }
          })

          if (report && report.status !== lastStatus) {
            lastStatus = report.status
            
            let progress = 0
            switch (report.status) {
              case 'PENDING':
                progress = 10
                break
              case 'PROCESSING':
                progress = 50
                break
              case 'DONE':
                progress = 100
                break
              case 'ERROR':
                progress = -1
                break
            }

            sendEvent('status', { 
              status: report.status.toLowerCase(), 
              progress,
              updatedAt: report.updatedAt
            })

            // End stream when done or error
            if (report.status === 'DONE' || report.status === 'ERROR') {
              clearInterval(pollInterval)
              controller.close()
            }
          }
        } catch (error) {
          console.error('SSE polling error:', error)
          sendEvent('error', { message: 'Failed to fetch status' })
          clearInterval(pollInterval)
          controller.close()
        }
      }, 2000) // Poll every 2 seconds

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}