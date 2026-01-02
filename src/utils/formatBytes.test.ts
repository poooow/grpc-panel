import { formatBytes } from './formatBytes';

describe('formatBytes', () => {
    test('should return "0 Bytes" for 0', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
    });

    test('should format Bytes correctly', () => {
        expect(formatBytes(100)).toBe('100 Bytes');
    });

    test('should format KB correctly', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
    });

    test('should format MB correctly', () => {
        expect(formatBytes(1048576)).toBe('1 MB');
        expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    test('should format GB correctly', () => {
        expect(formatBytes(1073741824)).toBe('1 GB');
    });

    test('should format TB correctly', () => {
        expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    test('should handle decimals parameter', () => {
        // Default is 2 decimals
        expect(formatBytes(1536)).toBe('1.5 KB'); // 1.50 -> 1.5 due to striping trailling zeros in Intl.NumberFormat if not enforced

        // Actually Intl.NumberFormat behavior depends on options. 
        // In the implementation: maximumFractionDigits: decimals, minimumFractionDigits: 0
        // So 1.500 would be 1.5

        // Let's test specific rounding
        const bytes = 1024 + 512 + 256; // 1.75 KB
        expect(formatBytes(bytes)).toBe('1.75 KB');

        expect(formatBytes(bytes, 1)).toBe('1.8 KB');
        expect(formatBytes(bytes, 0)).toBe('2 KB');
    });
});
