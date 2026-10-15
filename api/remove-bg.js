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

    // MODELO QUE SI SOPORTA HF AHORA - Xenova es la version ONNX de RMBG
    const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/Xenova/rmbg-1.4', {
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
      console.log('HF FAIL', hfRes.status, txt);
      return res.status(500).json({ error: txt.slice(0,500) });
    }

    const ab = await hfRes.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });

  } catch (e) {
    console.log('CATCH', e.message);
    return res.status(500).json({ error: e.message });
  }
}
