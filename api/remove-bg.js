export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { image } = req.body;
    const r = await fetch("https://router.huggingface.co/fal-ai/briaai/BRIA-RMBG-2.0", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image: `data:image/png;base64,${image}` })
    });
    if (!r.ok) throw new Error(await r.text());
    const buf = Buffer.from(await r.arrayBuffer()).toString('base64');
    res.status(200).json({ image: `data:image/png;base64,${buf}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
