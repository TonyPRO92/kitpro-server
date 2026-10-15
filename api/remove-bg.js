// KITPRO - Quita fondo GRATIS ILIMITADO
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Falta imagen' });
    const HF_TOKEN = process.env.HF_TOKEN;
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const response = await fetch('https://api-inference.huggingface.co/models/briaai/BRIA-RMBG-2.0', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    });

    if (!response.ok) {
      if (response.status === 503) return res.status(503).json({ error: 'Despertando, intenta 20s', retry: true });
      throw new Error(await response.text());
    }
    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString('base64');
    return res.status(200).json({ result: `data:image/png;base64,${resultBase64}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
