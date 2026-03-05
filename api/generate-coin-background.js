import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const multerMiddleware = upload.array('images', 5);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

async function generateWithGemini(promptText, imageFiles = []) {
  // Validate API key presence
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const parts = [{ text: promptText }];

  // Include up to 3 reference images (if provided)
  imageFiles.slice(0, 3).forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64')
      }
    });
  });

  // Corrected model name
  const model = 'gemini-2.0-flash-exp';  // ✅ FIXED
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }]
    })
  });

  const data = await response.json();

  // Check for API error response
  if (data.error) {
    console.error('Gemini API error:', data.error);
    throw new Error(`Gemini API error: ${data.error.message} (code ${data.error.code})`);
  }

  if (!data.candidates?.length) {
    console.log('Gemini response (no candidates):', JSON.stringify(data, null, 2));
    throw new Error('No image generated');
  }

  const partsResp = data.candidates[0].content?.parts || [];

  let imagePart = null;
  for (const part of partsResp) {
    if (part.inlineData?.data) {
      imagePart = part;
      break;
    }
  }

  if (!imagePart) {
    console.log('Gemini response (no inline image):', JSON.stringify(data, null, 2));
    throw new Error('No image returned from Gemini');
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await runMiddleware(req, res, multerMiddleware);

    const { type, shape, frontDescription, backDescription, patchDescription, velcro } = req.body;
    const imageFiles = req.files || [];

    if (!type || (type !== 'coin' && type !== 'patch')) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (type === 'coin') {
      if (!frontDescription?.trim() || !backDescription?.trim()) {
        return res.status(400).json({ error: 'Both front and back required' });
      }

      const frontPrompt = `
Create a high-quality 3D ${shape} challenge coin front design.
Description: ${frontDescription}.
Centered composition. Sharp engraving details. Realistic metal texture.
`;

      const backPrompt = `
Create a high-quality 3D ${shape} challenge coin back design.
Description: ${backDescription}.
Centered composition. Sharp engraving details. Realistic metal texture.
`;

      const [frontImageUrl, backImageUrl] = await Promise.all([
        generateWithGemini(frontPrompt, imageFiles),
        generateWithGemini(backPrompt, imageFiles)
      ]);

      return res.status(200).json({
        success: true,
        type,
        frontImageUrl,
        backImageUrl,
        shape,
        velcro: 'no'
      });

    } else { // patch
      if (!patchDescription?.trim()) {
        return res.status(400).json({ error: 'Patch description required' });
      }

      const extra = velcro === 'yes' ? 'Include velcro backing.' : '';

      const patchPrompt = `
Create a detailed embroidered unit patch design.
Shape: ${shape}.
Description: ${patchDescription}.
${extra}
Realistic stitching texture. Clean centered layout.
`;

      const patchImageUrl = await generateWithGemini(patchPrompt, imageFiles);

      return res.status(200).json({
        success: true,
        type,
        patchImageUrl,
        shape,
        velcro: velcro || 'no'
      });
    }

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Generation failed'
    });
  }
}