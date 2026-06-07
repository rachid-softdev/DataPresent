export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number;
}

export function toPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  limit: number,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const trimmedItems: T[] = hasMore ? items.slice(0, limit) : items;
  const lastItem = trimmedItems[trimmedItems.length - 1];

  let nextCursor: string | null = null;
  if (hasMore && lastItem && typeof lastItem === "object" && lastItem !== null) {
    const record = lastItem as Record<string, unknown>;
    const createdAt = record.createdAt;
    const id = record.id;
    if (createdAt && id) {
      nextCursor = encodeCursor(
        typeof createdAt === "string" ? new Date(createdAt) : (createdAt as Date),
        id as string,
      );
    }
  }

  return {
    items: trimmedItems,
    hasMore,
    nextCursor,
    totalCount,
  };
}

/**
 * Encode a cursor as base64-json: { createdAt, id }
 */
export function encodeCursor(createdAt: Date, id: string): string {
  const payload = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Decode a base64-json cursor back to { createdAt, id }
 */
export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const raw = Buffer.from(cursor, "base64").toString("utf8");
  const payload = JSON.parse(raw) as { createdAt: string; id: string };
  return { createdAt: new Date(payload.createdAt), id: payload.id };
}

export interface BuildPaginatedQueryArgs<T> {
  model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  cursor?: string;
  limit?: number;
}

/**
 * Build and execute a cursor-based paginated query against Prisma.
 * Uses `skip: 1` when a cursor is provided to exclude the cursor item itself.
 * Fetches `limit + 1` items to determine `hasMore`.
 */
export async function buildPaginatedQuery<T extends { id: string; createdAt: Date }>(
  args: BuildPaginatedQueryArgs<T>,
): Promise<PaginatedResponse<T>> {
  const limit = args.limit ?? 20;
  const take = limit + 1;

  const findArgs: Record<string, unknown> = {
    where: args.where ?? {},
    orderBy: args.orderBy ?? { createdAt: "desc" },
    take,
  };

  if (args.cursor) {
    const decoded = decodeCursor(args.cursor);
    findArgs.cursor = { id: decoded.id };
    findArgs.skip = 1;
  }

  const [items, totalCount] = await Promise.all([
    args.model.findMany(findArgs),
    args.model.count({ where: args.where ?? {} }),
  ]);

  return toPaginatedResponse(items, totalCount, limit);
}
