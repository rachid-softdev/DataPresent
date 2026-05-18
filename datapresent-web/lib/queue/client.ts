import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.error('REDIS_URL is not defined. Queue operations will fail.')
}

const connection = new IORedis(redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 5) {
      console.error('Redis connection failed after 5 retries')
      return null // stop retrying
    }
    return Math.min(times * 200, 2000)
  },
})

connection.on('error', (err) => {
  console.error('Redis connection error:', err.message)
})

export const generateQueue = new Queue('generate', { connection })
export const exportQueue = new Queue('export', { connection })

export { connection }