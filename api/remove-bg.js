export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const hfResponse = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!hfResponse.ok) {
      const err = await hfResponse.text();
      console.log('HF Error:', err);
      return res.status(500).json({ error: 'Error HF: ' + err });
    }

    const resultBuffer = await hfResponse.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString('base64');
    
    return res.status(200).json({ 
      image: `data:image/png;base64,${resultBase64}` 
    });

  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: e.message });
  }
}
