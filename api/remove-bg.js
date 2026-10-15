export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, msg: 'servidor vivo' });

  try {
    // Fix para el error de req.body undefined
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const image = body?.image;

    if (!image) {
      console.log('NO IMAGE, body:', !!req.body);
      return res.status(400).json({ error: 'no image recibido, body vacio' });
    }

    const buffer = Buffer.from(image, 'base64');

    const hfRes = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer
    });

    if (!hfRes.ok) {
      const txt = await hfRes.text();
      console.log('HF ERROR', txt);
      return res.status(500).json({ error: txt.slice(0,800) });
    }

    const ab = await hfRes.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });

  } catch (e) {
    console.log('CATCH', e.message);
    return res.status(500).json({ error: e.message });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};
