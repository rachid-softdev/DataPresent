/**
 * File upload validation utilities
 * Magic byte validation to prevent MIME type mismatch attacks
 */

const MAGIC_SIGNATURES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],     // %PDF
  xlsx: [[0x50, 0x4B, 0x03, 0x04]],     // PK\x03\x04 (ZIP)
  xls: [[0xD0, 0xCF, 0x11, 0xE0]],      // DCF (OLE2)
  csv: [],                                // no standard magic bytes
}

/**
 * Validate that a file's magic bytes match its declared extension
 * @param buffer - File content buffer
 * @param ext - File extension (lowercase, without dot)
 * @returns true if magic bytes match or no validation is possible
 */
export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (!ext) return false
  // Unknown extensions are rejected (defense-in-depth)
  if (!(ext in MAGIC_SIGNATURES)) return false
  const magicList = MAGIC_SIGNATURES[ext]
  // Known extension with no magic bytes (e.g. CSV) → trust MIME type
  if (magicList.length === 0) return true
  return magicList.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  )
}
