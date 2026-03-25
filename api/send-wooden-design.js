import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" }
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      name,
      email,
      phone,
      productType,
      dimensions,
      woodType,
      designDescription,
      finish,
      engraving,
      generatedImage,
      referenceImages
    } = req.body;

    let imageSection = "";
    if (generatedImage) {
      imageSection += `<p><b>Generated Design:</b><br><img src="${generatedImage}" width="200"/></p>`;
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
      <p><b>Product Type:</b> ${productType}</p>
      <p><b>Dimensions:</b> ${dimensions}</p>
      <p><b>Wood Type:</b> ${woodType}</p>
      <p><b>Finish:</b> ${finish || "natural"}</p>
      <p><b>Engraving:</b> ${engraving === "yes" ? "Yes (laser engraved)" : "No (printed)"}</p>
      <p><b>Design Description:</b> ${designDescription}</p>

      <h2>Generated Image</h2>
      ${imageSection}

      <h2>Reference Images</h2>
      ${referenceSection}
    `;

    await resend.emails.send({
      from: "Wooden Items Designer <onboarding@resend.dev>",
      to: "edwin@integritybottles.com", // replace with your team email
      subject: "New Wooden Item Design Request",
      html,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Email sending failed" });
  }
}