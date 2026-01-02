export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const number = bytes / Math.pow(k, i);

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
    }).format(number) + ' ' + sizes[i];
}