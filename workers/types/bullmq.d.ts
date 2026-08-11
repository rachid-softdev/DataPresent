import "bullmq";

// BullMQ's `IRedisClient` adapter interface (returned by `Queue.client` /
// `Worker.client`) does not declare `ping()`, even though every real client
// (ioredis, node-redis, Bun) implements it. Augment the interface so code that
// pings the connection through a BullMQ queue/worker type-checks.
declare module "bullmq" {
  interface IRedisClient {
    ping(): Promise<string>;
  }

  // `retryStrategy` is accepted at runtime by BullMQ workers but is missing
  // from the published `WorkerOptions` type. Declare it so worker
  // configuration can pass a custom retry backoff without a cast.
  interface WorkerOptions {
    retryStrategy?: (job?: any) => number | null;
  }
}
