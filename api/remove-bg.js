// KITPRO - Quita fondo GRATIS ILIMITADO - BLINDADO PARA TU APP
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.image?.[0];
    if (!file) return res.status(400).json({ error: 'No image file' });

    const buffer = fs.readFileSync(file.filepath);
    const HF_TOKEN = process.env.HF_TOKEN;

    const response = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 503) return res.status(503).json({ error: 'Modelo despertando, intenta en 20s', retry: true });
      throw new Error(text);
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
    const finalImage = `data:image/png;base64,${resultBase64}`;

    // Regreso en los 2 formatos para que tu app nunca falle
    return res.status(200).json({ url: finalImage, result: finalImage });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
