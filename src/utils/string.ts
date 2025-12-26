export const isBase64 = (str: string): boolean => {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
};

export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
