// Helper for generating Product Description
export async function generateProductDescription(name: string, price: string, context: string) {
    if (process.env.NODE_ENV !== 'production' && !process.env.OPENAI_API_KEY) {
        return `An exquisite piece of luxury jewelry, the ${name} is designed to captivate and shine.`;
    }

    const prompt = `Write an elegant, luxury product description for a jewelry business.
Product Name: ${name}
Price: ${price}
Campaign Theme: ${context}
Keep it to 2-3 sentences.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');

    return data.choices[0].message.content || '';
}

// Helper for generating Platform Captions
export async function generatePlatformCaptions(name: string, price: string, desc: string, context: string) {
    if (process.env.NODE_ENV !== 'production' && !process.env.OPENAI_API_KEY) {
        return [
            { platform: 'Instagram', caption_text: `✨ Stunning ${name} just landed! 💎`, hashtags: '#jewelry #luxury' },
            { platform: 'Facebook', caption_text: `Discover the elegance of our new ${name}.`, hashtags: '#fashion' },
            { platform: 'TikTok', caption_text: `Bling alert! 💍 check out the ${name}`, hashtags: '#bling #jeweler' },
            { platform: 'X', caption_text: `Elevate your style with ${name} for ${price}.`, hashtags: '#style' },
            { platform: 'WhatsApp', caption_text: `Hi! We're excited to present the new ${name}. Message us for details!`, hashtags: '' },
        ];
    }

    const prompt = `Generate promotional captions for 5 different platforms for our luxury jewelry product.
Product Name: ${name}
Price: ${price}
Description: ${desc}
Campaign Theme: ${context}

Respond ONLY with a valid JSON object with a single key "captions" containing an array of objects. Each object must have:
- "platform": string (exactly one of: "Instagram", "Facebook", "TikTok", "X", "WhatsApp")
- "caption_text": string (the text with emojis and CTA)
- "hashtags": string (space separated hashtags)`;

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');

        const content = data.choices[0].message.content || '{"captions":[]}';
        const parsed = JSON.parse(content);
        return parsed.captions || [];
    } catch (error) {
        console.error("OpenAI Error:", error);
        return [];
    }
}
