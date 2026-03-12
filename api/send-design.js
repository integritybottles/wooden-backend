import multer from "multer";
import nodemailer from "nodemailer";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ------------------ MULTER ------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB per file
  },
});

const multerMiddleware = upload.array("images", 3);

// helper
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

// ------------------ API ------------------

export default async function handler(req, res) {

  // CORS headers
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
      // generatedFront,    // <-- commented out
      // generatedBack,     // <-- commented out
      // generatedPatch     // <-- commented out
    } = req.body;

    // const uploadedFiles = req.files || [];  // <-- optional: also ignore uploaded files

    // ------------------ EMAIL ------------------

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const html = `
      <h2>New AI Design Submission</h2>

      <h3>Customer Info</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>

      <h3>Design Details</h3>
      <p><b>Type:</b> ${type}</p>
      <p><b>Shape:</b> ${shape}</p>

      ${frontDescription ? `<p><b>Front Description:</b> ${frontDescription}</p>` : ""}
      ${backDescription ? `<p><b>Back Description:</b> ${backDescription}</p>` : ""}
      ${patchDescription ? `<p><b>Patch Description:</b> ${patchDescription}</p>` : ""}

      <p><b>Velcro:</b> ${velcro}</p>

      <!-- Image sections removed for testing -->
    `;

    const attachments = [];

    // uploadedFiles.forEach((file, index) => {   // <-- commented out
    //   attachments.push({
    //     filename: `reference-${index + 1}-${file.originalname}`,
    //     content: file.buffer,
    //   });
    // });

    await transporter.sendMail({
      from: `"AI Coin Generator" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: "New Coin/Patch Design Submission",
      html,
      attachments,
    });

    return res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.error("Send design error:", error);

    return res.status(500).json({
      success: false,
      error: "Email failed",
    });
  }
}