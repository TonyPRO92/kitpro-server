export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const image = body?.image;
    if (!image) return res.status(400).json({ error: 'no image' });

    if (!process.env.HF_TOKEN) {
      return res.status(500).json({ error: 'HF_TOKEN no existe en Vercel Settings' });
    }

    const buffer = Buffer.from(image, 'base64');

    // FORZAMOS proveedor hf-inference que SI soporta RMBG
    const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4?provider=hf-inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer
    });

    const contentType = hfRes.headers.get('content-type');
    if (!hfRes.ok) {
      const txt = await hfRes.text();
      console.log('HF FAIL', hfRes.status, txt);
      return res.status(500).json({ error: `HF ${hfRes.status}: ${txt.slice(0,600)}` });
    }

    // Si HF regresa JSON es que el modelo está cargando
    if (contentType?.includes('application/json')) {
      const json = await hfRes.json();
      console.log('HF JSON', JSON.stringify(json));
      return res.status(500).json({ error: 'Modelo cargando, intenta en 10 seg: ' + JSON.stringify(json).slice(0,300) });
    }

    const ab = await hfRes.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });

  } catch (e) {
    console.log('CATCH REAL:', e.message, e.stack);
    return res.status(500).json({ error: 'CATCH: ' + e.message });
  }
}
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
