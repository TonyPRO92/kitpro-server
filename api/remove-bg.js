export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'no image' });

    const buffer = Buffer.from(image, 'base64');

    const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4', {
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
      console.log('HF FAIL', hfRes.status, txt.slice(0,300));
      return res.status(500).json({ error: `HF ${hfRes.status}: ${txt.slice(0,200)}` });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return res.status(200).json({ image: `data:image/png;base64,${base64}` });

  } catch (e) {
    console.log('SERVER CATCH', e.message);
    return res.status(500).json({ error: e.message });
  }
}
