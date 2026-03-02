const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-001";

const toneDescriptions: Record<string, string> = {
    Luxury: 'sophisticated, elegant, aspirational, high-end brand voice',
    Trendy: 'fun, youthful, energetic, Gen-Z lifestyle brand voice',
    Minimal: 'clean, simple, understated, Scandinavian minimalist voice',
    Bold: 'powerful, dramatic, statement-making, confident brand voice',
};

async function callOpenRouter(prompt: string) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://jeweler.ai", // Optional, for OpenRouter rankings
            "X-Title": "Jeweler AI", // Optional, for OpenRouter rankings
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": MODEL,
            "messages": [
                { "role": "user", "content": prompt }
            ],
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenRouter API error');
    }

    return data.choices[0].message.content;
}

// Helper for generating Product Description
export async function generateProductDescription(name: string, price: string, context: string, tone: string = 'Luxury') {
    if (process.env.NODE_ENV !== 'production' && !OPENROUTER_API_KEY) {
        return `An exquisite piece of luxury jewelry, the ${name} is designed to captivate and shine.`;
    }

    const toneDesc = toneDescriptions[tone] || toneDescriptions.Luxury;
    const prompt = `Write an elegant product description for a jewelry business.
Product Name: ${name}
Price: ${price}
Campaign Theme: ${context}
Tone: ${tone} (${toneDesc})
Keep it to 2-3 sentences.`;

    try {
        return await callOpenRouter(prompt);
    } catch (error) {
        console.error("OpenRouter Error (Description):", error);
        return `An exquisite piece of luxury jewelry, the ${name} is designed to captivate and shine.`;
    }
}

// Helper for generating Platform Captions
export async function generatePlatformCaptions(name: string, price: string, desc: string, context: string, tone: string = 'Luxury') {
    if (process.env.NODE_ENV !== 'production' && !OPENROUTER_API_KEY) {
        return [
            { platform: 'Instagram', caption_text: `✨ Stunning ${name} just landed! 💎`, hashtags: '#jewelry #luxury' },
            { platform: 'Facebook', caption_text: `Discover the elegance of our new ${name}.`, hashtags: '#fashion' },
            { platform: 'TikTok', caption_text: `Bling alert! 💍 check out the ${name}`, hashtags: '#bling #jeweler' },
            { platform: 'X', caption_text: `Elevate your style with ${name} for ${price}.`, hashtags: '#style' },
            { platform: 'WhatsApp', caption_text: `Hi! We're excited to present the new ${name}. Message us for details!`, hashtags: '' },
        ];
    }

    const toneDesc = toneDescriptions[tone] || toneDescriptions.Luxury;
    const prompt = `Generate promotional captions for 5 different platforms for our jewelry product.
Product Name: ${name}
Price: ${price}
Description: ${desc}
Campaign Theme: ${context}
Tone: ${tone} (${toneDesc})

Respond ONLY with a valid JSON object with a single key "captions" containing an array of objects. Each object must have:
- "platform": string (exactly one of: "Instagram", "Facebook", "TikTok", "X", "WhatsApp")
- "caption_text": string (the text with emojis and CTA)
- "hashtags": string (space separated hashtags)`;

    try {
        const content = await callOpenRouter(prompt);
        const cleanContent = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        return parsed.captions || [];
    } catch (error) {
        console.error("OpenRouter Error (Captions):", error);
        return [
            { platform: 'Instagram', caption_text: `✨ Stunning ${name} just landed! 💎`, hashtags: '#jewelry #luxury' },
            { platform: 'Facebook', caption_text: `Discover the elegance of our new ${name}.`, hashtags: '#fashion' },
            { platform: 'TikTok', caption_text: `Bling alert! 💍 check out the ${name}`, hashtags: '#bling #jeweler' },
            { platform: 'X', caption_text: `Elevate your style with ${name} for ${price}.`, hashtags: '#style' },
            { platform: 'WhatsApp', caption_text: `Hi! We're excited to present the new ${name}. Message us for details!`, hashtags: '' },
        ];
    }
}

