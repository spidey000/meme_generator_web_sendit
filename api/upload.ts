
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;
    if (!imageData || !imageData.startsWith('data:image')) {
        return res.status(400).json({ error: 'Invalid image data' });
    }

    // Convert base64 to a Buffer
    const base64Data = imageData.split(';base64,').pop();
    if (!base64Data) {
        return res.status(400).json({ error: 'Invalid base64 data' });
    }
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const filename = `meme-${Date.now()}.jpg`;

    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    res.status(200).json({ url: blob.url });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}
