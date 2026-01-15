// electron/ai/CRC32.ts
export class CRC32 {
  private static table: number[] = [];

  static {
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      CRC32.table[i] = c >>> 0;
    }
  }

  static calculate(buffer: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
      const code = buffer[i];
      crc = (crc >>> 8) ^ CRC32.table[(crc ^ code) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  }
}
