export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No llego imagen' });

    const HF_TOKEN = process.env.HF_TOKEN;
    const buffer = Buffer.from(image, 'base64');

    // NUEVA RUTA OFICIAL DE HUGGINGFACE 2026
    const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'x-wait-for-model': 'true'
      },
      body: buffer
    });

    const contentType = hfResponse.headers.get('content-type');
    
    if (!hfResponse.ok) {
      const txt = await hfResponse.text();
      return res.status(500).json({ error: `HF Error ${hfResponse.status}: ${txt.slice(0,500)}` });
    }

    const arrayBuffer = await hfResponse.arrayBuffer();
    const base64Result = Buffer.from(arrayBuffer).toString('base64');
    
    return res.status(200).json({ 
      image: `data:image/png;base64,${base64Result}` 
    });

  } catch (e) {
    return res.status(500).json({ error: 'CATCH: ' + e.message });
  }
}
