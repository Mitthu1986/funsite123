const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    const apiKey = process.env.FACE_API_KEY;
    const apiSecret = process.env.FACE_API_SECRET;
    if (!apiKey || !apiSecret) {
        console.error('Smile detection is missing server environment variables.');
        return res.status(500).json({ error: 'Smile detection is not configured on the server.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const imageBase64 = body.imageBase64;
    if (
        typeof imageBase64 !== 'string'
        || imageBase64.length === 0
        || imageBase64.length > MAX_IMAGE_BASE64_LENGTH
        || imageBase64.length % 4 !== 0
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    ) {
        return res.status(400).json({ error: 'A valid image is required.' });
    }

    const form = new URLSearchParams({
        api_key: apiKey,
        api_secret: apiSecret,
        image_base64: imageBase64,
        return_attributes: 'smiling'
    });

    try {
        const upstreamResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form
        });
        const result = await upstreamResponse.json();

        if (!upstreamResponse.ok || result.error_message) {
            console.error('Face++ smile detection failed with status:', upstreamResponse.status);
            return res.status(502).json({ error: 'Smile detection failed. Please try again.' });
        }

        const faces = Array.isArray(result.faces) ? result.faces : [];
        const smile = faces[0] && faces[0].attributes && faces[0].attributes.smile;
        const isSmiling = Boolean(
            smile
            && Number.isFinite(smile.value)
            && Number.isFinite(smile.threshold)
            && smile.value > smile.threshold
        );

        return res.status(200).json({
            faceDetected: faces.length > 0,
            isSmiling
        });
    } catch (error) {
        console.error('Smile detection request failed:', error);
        return res.status(502).json({ error: 'Smile detection is unavailable. Please try again.' });
    }
};
