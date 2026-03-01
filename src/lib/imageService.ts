// Mock image styling since no specific external API details were provided
// but we allow Real APIs by checking process.env.IMAGE_API_KEY

export async function processStyledImage(originalUrl: string, logoUrl: string, price: string, context: string) {
    if (process.env.IMAGE_API_KEY && process.env.IMAGE_API_URL) {
        // Real Integration
        const res = await fetch(process.env.IMAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.IMAGE_API_KEY}`
            },
            body: JSON.stringify({ image_url: originalUrl, price, context, logo_url: logoUrl })
        });
        const data = await res.json();
        return data.styled_image_url;
    }

    // Graceful fallback: just return the original URL but add a query param to trick cache if needed
    // In a real scenario, this would be a processed image.
    return `${originalUrl}?styled=true&theme=luxury`;
}

export async function processCompositeImage(styledImageUrls: string[]) {
    if (process.env.IMAGE_API_KEY && process.env.IMAGE_API_URL) {
        // Real Integration
        const res = await fetch(`${process.env.IMAGE_API_URL}/collage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.IMAGE_API_KEY}`
            },
            body: JSON.stringify({ images: styledImageUrls })
        });
        const data = await res.json();
        return data.composite_image_url;
    }

    // Graceful fallback for composite: Just take the first image if available
    return styledImageUrls[0] || '';
}
