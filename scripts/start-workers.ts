import { generateWorker } from '../src/lib/queue/workers/generate.worker'
import { exportWorker } from '../src/lib/queue/workers/export.worker'

console.log('🚀 Workers started:', new Date().toISOString())
console.log('📊 Generate worker ready')
console.log('📦 Export worker ready')

const cleanup = async () => {
  console.log('🛑 Shutting down workers...')
  await generateWorker.close()
  await exportWorker.close()
  process.exit(0)
}

process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)