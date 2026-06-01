import { createServer } from 'node:http'
import { initSentry } from './sentry.js'
import { getGenerateWorker } from './workers/generate.worker.js'
import { getExportWorker } from './workers/export.worker.js'

const PORT = parseInt(process.env.PORT || '8080', 10)

async function main() {
  initSentry()
  console.log('[workers] Starting up...')

  // Start BullMQ workers
  const generateWorker = await getGenerateWorker()
  const exportWorker = await getExportWorker()

  console.log('[workers] Generate worker ready')
  console.log('[workers] Export worker ready')

  // Health HTTP server for Railway
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'healthy',
        workers: {
          generate: generateWorker ? 'running' : 'stopped',
          export: exportWorker ? 'running' : 'stopped',
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }))
    } else if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('DataPresent Workers')
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  })

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[workers] Health server listening on 0.0.0.0:${PORT}`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[workers] Received ${signal}, shutting down gracefully...`)

    // Stop accepting new HTTP connections
    await new Promise<void>((resolve) => server.close(() => resolve()))

    // Drain BullMQ workers
    const closePromises: Promise<void>[] = []
    if (generateWorker) closePromises.push(generateWorker.close())
    if (exportWorker) closePromises.push(exportWorker.close())

    const results = await Promise.allSettled(closePromises)
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[workers] Worker close failed:', result.reason)
      }
    }

    console.log('[workers] All workers closed')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[workers] Fatal error:', err)
  process.exit(1)
})
