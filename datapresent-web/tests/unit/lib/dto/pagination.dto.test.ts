// ==========================================
// Pagination DTO Tests (Sprint 6, Item 2)
// ==========================================
//
// Tests for lib/dto/pagination.dto.ts:
// - toPaginatedResponse() with hasMore detection
// - Cursor encoding/decoding (base64-json roundtrip)
// - buildPaginatedQuery() arguments and execution
// - Edge cases: empty results, single item, exact limit

import { describe, it, expect, vi } from "vitest";
import {
  toPaginatedResponse,
  encodeCursor,
  decodeCursor,
  buildPaginatedQuery,
} from "@/lib/dto/pagination.dto";

describe("Pagination DTO (pagination.dto.ts)", () => {
  // ======================================================================
  // toPaginatedResponse
  // ======================================================================

  describe("toPaginatedResponse", () => {
    it("should return items when count is below limit", () => {
      const items = [
        { id: "1", createdAt: new Date("2025-01-01") },
        { id: "2", createdAt: new Date("2025-01-02") },
      ];

      const result = toPaginatedResponse(items, 2, 10);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(2);
    });

    it("should detect hasMore when items exceed limit", () => {
      const items = [
        { id: "1", createdAt: new Date("2025-01-01") },
        { id: "2", createdAt: new Date("2025-01-02") },
        { id: "3", createdAt: new Date("2025-01-03") },
      ];

      const result = toPaginatedResponse(items, 3, 2);

      expect(result.items).toHaveLength(2); // Trimmed to limit
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
      expect(result.totalCount).toBe(3);
    });

    it("should generate nextCursor from last item when hasMore", () => {
      const items = [
        { id: "1", createdAt: new Date("2025-01-01") },
        { id: "2", createdAt: new Date("2025-01-02") },
        { id: "3", createdAt: new Date("2025-01-03") },
      ];

      const result = toPaginatedResponse(items, 3, 2);

      expect(result.nextCursor).not.toBeNull();
      // Should be base64 encoded JSON containing id "2" (last in trimmed list)
      const decoded = decodeCursor(result.nextCursor!);
      expect(decoded.id).toBe("2");
    });

    it("should return nextCursor null when no hasMore", () => {
      const items = [
        { id: "1", createdAt: new Date("2025-01-01") },
        { id: "2", createdAt: new Date("2025-01-02") },
      ];

      const result = toPaginatedResponse(items, 2, 10);

      expect(result.nextCursor).toBeNull();
    });

    it("should handle empty items array", () => {
      const result = toPaginatedResponse([], 0, 10);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(0);
    });

    it("should handle single item equal to limit (no hasMore)", () => {
      const items = [{ id: "1", createdAt: new Date("2025-01-01") }];

      const result = toPaginatedResponse(items, 1, 1);

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should handle items without createdAt/id gracefully", () => {
      const items = [{ name: "Item1" }, { name: "Item2" }, { name: "Item3" }] as any[];

      const result = toPaginatedResponse(items, 3, 2);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeNull(); // No cursor since items lack createdAt/id
    });

    it("should handle items with createdAt as string", () => {
      const items = [
        { id: "1", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: "2", createdAt: "2025-01-02T00:00:00.000Z" },
        { id: "3", createdAt: "2025-01-03T00:00:00.000Z" },
      ];

      const result = toPaginatedResponse(items, 3, 2);

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
      const decoded = decodeCursor(result.nextCursor!);
      expect(decoded.id).toBe("2");
    });
  });

  // ======================================================================
  // encodeCursor / decodeCursor
  // ======================================================================

  describe("encodeCursor / decodeCursor", () => {
    it("should roundtrip cursor encoding and decoding", () => {
      const date = new Date("2025-06-15T12:30:00.000Z");
      const id = "item-42";

      const encoded = encodeCursor(date, id);
      const decoded = decodeCursor(encoded);

      expect(decoded.id).toBe(id);
      expect(decoded.createdAt.toISOString()).toBe(date.toISOString());
    });

    it("should produce valid base64 string", () => {
      const encoded = encodeCursor(new Date(), "test-id");

      // Should be a valid base64 string
      expect(() => Buffer.from(encoded, "base64")).not.toThrow();
      const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
      expect(decoded).toHaveProperty("createdAt");
      expect(decoded).toHaveProperty("id");
    });

    it("should handle different dates correctly", () => {
      const date1 = new Date("2024-01-01T00:00:00.000Z");
      const date2 = new Date("2025-12-31T23:59:59.999Z");
      const id = "item-1";

      const encoded1 = encodeCursor(date1, id);
      const encoded2 = encodeCursor(date2, id);

      expect(encoded1).not.toBe(encoded2);
    });

    it("should produce deterministic output for same inputs", () => {
      const date = new Date("2025-06-15T12:30:00.000Z");
      const id = "item-42";

      const encoded1 = encodeCursor(date, id);
      const encoded2 = encodeCursor(date, id);

      expect(encoded1).toBe(encoded2);
    });

    it("should throw on invalid base64 cursor", () => {
      expect(() => decodeCursor("not-valid-base64!!!")).toThrow();
    });

    it("should throw on malformed JSON cursor", () => {
      const bad = Buffer.from("not-json").toString("base64");
      expect(() => decodeCursor(bad)).toThrow();
    });
  });

  // ======================================================================
  // buildPaginatedQuery
  // ======================================================================

  describe("buildPaginatedQuery", () => {
    it("should call findMany and count with correct arguments", async () => {
      const findMany = vi.fn().mockResolvedValue([
        { id: "1", createdAt: new Date("2025-01-01"), name: "A" },
        { id: "2", createdAt: new Date("2025-01-02"), name: "B" },
      ]);
      const count = vi.fn().mockResolvedValue(2);

      const result = await buildPaginatedQuery({
        model: { findMany, count },
        where: { orgId: "org-1" },
        orderBy: { createdAt: "asc" },
        limit: 10,
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: "org-1" },
          orderBy: { createdAt: "asc" },
          take: 11, // limit + 1
        }),
      );
      expect(count).toHaveBeenCalledWith({ where: { orgId: "org-1" } });
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it("should use default limit of 20 when not specified", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const count = vi.fn().mockResolvedValue(0);

      await buildPaginatedQuery({
        model: { findMany, count },
        where: {},
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 21, // 20 + 1
        }),
      );
    });

    it("should use default orderBy createdAt desc", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const count = vi.fn().mockResolvedValue(0);

      await buildPaginatedQuery({
        model: { findMany, count },
        where: {},
        limit: 5,
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should pass cursor with skip:1 when cursor is provided", async () => {
      const date = new Date("2025-01-15T10:00:00.000Z");
      const cursor = encodeCursor(date, "item-5");

      const findMany = vi.fn().mockResolvedValue([
        { id: "6", createdAt: new Date("2025-01-16"), name: "F" },
        { id: "7", createdAt: new Date("2025-01-17"), name: "G" },
      ]);
      const count = vi.fn().mockResolvedValue(10);

      await buildPaginatedQuery({
        model: { findMany, count },
        where: {},
        cursor,
        limit: 5,
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "item-5" },
          skip: 1,
          take: 6,
        }),
      );
    });

    it("should detect hasMore when more items than limit are returned", async () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        id: `${i + 1}`,
        createdAt: new Date(`2025-01-${String(i + 1).padStart(2, "0")}`),
      }));

      const findMany = vi.fn().mockResolvedValue(items);
      const count = vi.fn().mockResolvedValue(20);

      const result = await buildPaginatedQuery({
        model: { findMany, count },
        where: {},
        limit: 10,
      });

      expect(result.items).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it("should handle empty result set", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const count = vi.fn().mockResolvedValue(0);

      const result = await buildPaginatedQuery({
        model: { findMany, count },
        where: {},
        limit: 10,
      });

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.totalCount).toBe(0);
    });

    it("should passthrough empty where clause", async () => {
      const findMany = vi.fn().mockResolvedValue([]);
      const count = vi.fn().mockResolvedValue(0);

      await buildPaginatedQuery({
        model: { findMany, count },
        limit: 10,
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });
});
