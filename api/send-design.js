import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb"
    }
  }
};

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

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
      generatedPatch,
      referenceImages
    } = req.body;

    let imageSection = "";

    if (generatedFront) {
      imageSection += `<p><b>Generated Front:</b><br><img src="${generatedFront}" width="200"/></p>`;
    }

    if (generatedBack) {
      imageSection += `<p><b>Generated Back:</b><br><img src="${generatedBack}" width="200"/></p>`;
    }

    if (generatedPatch) {
      imageSection += `<p><b>Generated Patch:</b><br><img src="${generatedPatch}" width="200"/></p>`;
    }

    let referenceSection = "";

    if (referenceImages && Array.isArray(referenceImages)) {
      referenceImages.forEach(url => {
        referenceSection += `<p><img src="${url}" width="200"/></p>`;
      });
    }

    const html = `
      <h2>Customer Information</h2>

      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>

      <h2>Design Details</h2>

      <p><b>Type:</b> ${type}</p>
      <p><b>Shape:</b> ${shape}</p>
      <p><b>Velcro:</b> ${velcro}</p>

      <p><b>Front Description:</b> ${frontDescription}</p>
      <p><b>Back Description:</b> ${backDescription}</p>
      <p><b>Patch Description:</b> ${patchDescription}</p>

      <h2>Generated Images</h2>
      ${imageSection}

      <h2>Reference Images</h2>
      ${referenceSection}
    `;

    await resend.emails.send({
      from: "Coin Designer <design@allegiancecoin.com>",
      to: ["your@email.com"],
      subject: "New Coin Design Request",
      html
    });

    return res.status(200).json({ success: true });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Email sending failed"
    });

  }

}
