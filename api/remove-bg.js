export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'no image' });

    // fal-ai SI soporta RMBG-1.4
    const hfRes = await fetch('https://router.huggingface.co/fal-ai/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:image/png;base64,${image}`
      })
    });

    const data = await hfRes.json();
    console.log('FAL RESP', JSON.stringify(data).slice(0,500));

    if (!hfRes.ok) {
      return res.status(500).json({ error: data.error || JSON.stringify(data).slice(0,500) });
    }

    // fal-ai regresa { image: { url: "https://..." } } o base64
    let finalBase64 = "";
    if (data.image?.url) {
      const imgRes = await fetch(data.image.url);
      const ab = await imgRes.arrayBuffer();
      finalBase64 = Buffer.from(ab).toString('base64');
    } else if (data.image_base64) {
      finalBase64 = data.image_base64;
    } else if (data.image) {
      finalBase64 = data.image;
    }

    return res.status(200).json({ image: `data:image/png;base64,${finalBase64}` });

  } catch (e) {
    console.log('CATCH', e.message);
    return res.status(500).json({ error: e.message });
  }
}
