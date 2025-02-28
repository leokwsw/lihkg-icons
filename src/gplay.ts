import rp = require("request-promise-native");

export async function app(appId: string) {
    try {
        const response = await rp({
            url: `https://play.google.com/store/apps/details?id=${appId}`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
            gzip: true
        });
        const match = response.match(/\[\[\["([\d.]+)"]]/);

        if (match && match[1]) {
            return match[1];
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}
