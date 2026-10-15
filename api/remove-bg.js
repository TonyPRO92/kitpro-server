export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: 'Solo POST' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No llego imagen, pesa mucho' });

    const HF_TOKEN = process.env.HF_TOKEN;
    if (!HF_TOKEN) return res.status(500).json({ error: 'Falta HF_TOKEN en Vercel' });

    const buffer = Buffer.from(image, 'base64');

    let hfResponse = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
      body: buffer
    });

    // Si el modelo está dormido, lo intentamos de nuevo
    if (hfResponse.status === 503) {
      await new Promise(r => setTimeout(r, 4000));
      hfResponse = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
        body: buffer
      });
    }

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      return res.status(500).json({ error: `HF fallo: ${errorText.substring(0, 400)}` });
    }

    const arrayBuffer = await hfResponse.arrayBuffer();
    const base64Result = Buffer.from(arrayBuffer).toString('base64');
    return res.status(200).json({ image: `data:image/png;base64,${base64Result}` });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
