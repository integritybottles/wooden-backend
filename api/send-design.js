import multer from "multer";
import { Resend } from "resend";

export const config = {
  api: {
    bodyParser: false,
  },
};

const resend = new Resend(process.env.RESEND_API_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
});

const multerMiddleware = upload.array("images", 3);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {

    await runMiddleware(req, res, multerMiddleware);

    const {
  name,
  email,
  phone,
  type,
  shape,
  frontDescription,
  backDescription,
  patchDescription,
  velcro,
  generatedFront,
  generatedBack,
  generatedPatch
} = req.body;


    const uploadedFiles = req.files || [];

    const attachments = uploadedFiles.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

   const html = `
<h2>New AI Design Submission</h2>

<h3>Customer Info</h3>
<p><b>Name:</b> ${name}</p>
<p><b>Email:</b> ${email}</p>
<p><b>Phone:</b> ${phone}</p>

<h3>Design Details</h3>
<p><b>Type:</b> ${type}</p>
<p><b>Shape:</b> ${shape}</p>

<p><b>Front Description:</b> ${frontDescription}</p>
<p><b>Back Description:</b> ${backDescription}</p>
<p><b>Patch Description:</b> ${patchDescription}</p>

<p><b>Velcro:</b> ${velcro}</p>

<h3>Generated Design</h3>

${generatedFront ? `<p><b>Front:</b><br><img src="${generatedFront}" width="250"/></p>` : ""}
${generatedBack ? `<p><b>Back:</b><br><img src="${generatedBack}" width="250"/></p>` : ""}
${generatedPatch ? `<p><b>Patch:</b><br><img src="${generatedPatch}" width="250"/></p>` : ""}
`;

    await resend.emails.send({
      from: "AI Coin Generator <onboarding@resend.dev>",
      to: "chandra@integritybottles.com",
      subject: "New Coin / Patch Design",
      html: html,
      attachments: attachments,
    });

    return res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
    });
  }
}