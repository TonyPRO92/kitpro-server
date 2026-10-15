
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido. Utiliza POST.'
    });
  }

  try {
    const token = process.env.BRIA_API_TOKEN;

    if (!token) {
      console.error('Falta BRIA_API_TOKEN en Vercel.');

      return res.status(500).json({
        error: 'El servicio de eliminación de fondo no está configurado.'
      });
    }

    const { image } = req.body || {};

    if (typeof image !== 'string' || image.length === 0) {
      return res.status(400).json({
        error: 'No se recibió una imagen Base64 válida.'
      });
    }

    // BRIA espera Base64 puro, sin el prefijo data:image/...
    const base64Image = image.replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      ''
    );

    if (!base64Image || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Image)) {
      return res.status(400).json({
        error: 'La imagen recibida no tiene un formato Base64 válido.'
      });
    }

    // Solicitar la eliminación del fondo a BRIA.
    const briaResponse = await fetch(
      'https://engine.prod.bria-api.com/v2/image/edit/remove_background',
      {
        method: 'POST',
        headers: {
          'api_token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'AI-Tools-Kit/1.0'
        },
        body: JSON.stringify({
          image: base64Image,
          sync: true
        })
      }
    );

    const briaText = await briaResponse.text();

    let briaData;

    try {
      briaData = JSON.parse(briaText);
    } catch {
      console.error(
        'BRIA devolvió una respuesta no JSON:',
        briaResponse.status,
        briaText.slice(0, 500)
      );

      return res.status(502).json({
        error: 'BRIA devolvió una respuesta inesperada.'
      });
    }

    if (!briaResponse.ok) {
      console.error(
        'BRIA API error:',
        briaResponse.status,
        JSON.stringify(briaData).slice(0, 1000)
      );

      const status = briaResponse.status;

      const message =
        status === 401
          ? 'BRIA rechazó la clave API. Comprueba BRIA_API_TOKEN.'
          : status === 403
            ? 'La cuenta de BRIA no tiene acceso a esta función.'
            : status === 429
              ? 'Se alcanzó el límite de solicitudes de BRIA.'
              : 'BRIA no pudo procesar la imagen.';

      return res.status(502).json({
        error: message,
        providerStatus: status,
        detail: briaData.error?.message ||
          briaData.message ||
          briaData.detail ||
          'Consulta los registros de Vercel.'
      });
    }

    const imageUrl = briaData.result?.image_url;

    if (typeof imageUrl !== 'string' || !imageUrl) {
      console.error(
        'BRIA no devolvió result.image_url:',
        JSON.stringify(briaData).slice(0, 1000)
      );

      return res.status(502).json({
        error: 'BRIA terminó la solicitud, pero no devolvió la URL de la imagen.'
      });
    }

    // Descargar la imagen final para conservar el formato
    // que espera actualmente AI Tools Kit.
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      console.error(
        'Error descargando resultado BRIA:',
        imageResponse.status
      );

      return res.status(502).json({
        error: 'No se pudo descargar la imagen procesada por BRIA.'
      });
    }

    const contentType =
      imageResponse.headers.get('content-type') || '';

    if (!contentType.toLowerCase().startsWith('image/')) {
      console.error(
        'BRIA devolvió un tipo de contenido inesperado:',
        contentType
      );

      return res.status(502).json({
        error: 'El resultado descargado no es una imagen.'
      });
    }

    const buffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );

    if (buffer.length === 0) {
      return res.status(502).json({
        error: 'BRIA devolvió una imagen vacía.'
      });
    }

    const mimeType = contentType
      .split(';')[0]
      .trim()
      .toLowerCase();

    console.log(
      'Eliminación de fondo completada:',
      buffer.length,
      'bytes'
    );

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
