export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No llego imagen' });

  try {
    const buffer = Buffer.from(image, 'base64');
    const r = await fetch('https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'x-wait-for-model': 'true'
      },
      body: buffer
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: t.slice(0,500) });
    }
    const ab = await r.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
