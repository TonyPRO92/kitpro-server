export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'no image' });

    const buffer = Buffer.from(image, 'base64');

    // API VIEJA DIRECTA - ESTA SI AGARRA RMBG
    const hfRes = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'x-wait-for-model': 'true'
      },
      body: buffer
    });

    if (!hfRes.ok) {
      const txt = await hfRes.text();
      console.log('FAL RESP', txt);
      return res.status(500).json({ error: txt.slice(0,500) });
    }

    const ab = await hfRes.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
