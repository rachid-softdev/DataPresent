import { Queue } from 'bullmq'
import { getRedisConnection } from '@/lib/redis'

const connection = getRedisConnection()

export const generateQueue = new Queue('generate', { connection })
export const exportQueue = new Queue('export', { connection })

export { connection }