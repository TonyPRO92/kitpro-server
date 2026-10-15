
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido. Utiliza POST.'
    });
  }

  try {
    const { image } = req.body || {};

    if (
      typeof image !== 'string' ||
      image.length === 0
    ) {
      return res.status(400).json({
        error: 'No se recibió una imagen Base64 válida.'
      });
    }

    if (!process.env.HF_TOKEN) {
      return res.status(500).json({
        error: 'Falta configurar HF_TOKEN en Vercel.'
      });
    }

    const response = await fetch(
      'https://router.huggingface.co/fal-ai/briaai/BRIA-RMBG-2.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'image/png, image/*, application/json'
        },
        body: JSON.stringify({
          image: `data:image/png;base64,${image}`
        })
      }
    );

    const contentType =
      response.headers.get('content-type') || '';

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        'Hugging Face error:',
        response.status,
        errorText.slice(0, 1000)
      );

      return res.status(502).json({
        error: `El servicio de eliminación de fondo respondió HTTP ${response.status}.`,
        detail: errorText.slice(0, 500)
      });
    }

    if (!contentType.toLowerCase().startsWith('image/')) {
      const responseText = await response.text();

      console.error(
        'Formato inesperado de Hugging Face:',
        contentType,
        responseText.slice(0, 500)
      );

      return res.status(502).json({
        error: 'El servicio no devolvió una imagen.',
        detail: responseText.slice(0, 300)
      });
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (buffer.length === 0) {
      return res.status(502).json({
        error: 'El servicio devolvió una imagen vacía.'
      });
    }

    const mimeType = contentType
      .split(';')[0]
      .trim()
      .toLowerCase();

    return res.status(200).json({
      image: `data:${mimeType};base64,${buffer.toString('base64')}`
    });

  } catch (error) {
    console.error('Error en remove-bg:', error);

    return res.status(500).json({
      error: 'No se pudo procesar la imagen.',
      detail: error.message || 'Error interno del servidor.'
    });
  }
}
