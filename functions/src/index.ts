import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import {defineString, defineSecret} from "firebase-functions/params";

const emailAddress = defineSecret("EMAIL_ADDRESS");
const emailPassword = defineSecret("EMAIL_PASSWORD");
const senderName = defineString("SENDER_NAME", {description: "Sender name that show in email content"});

interface EmailData {
  name: string;
  email: string;
  countryCode: string;
  countryName: string;
  phone: string;
  note: string;
  emailTo: string;
}

export const sendEmail = functions.runWith({
  secrets: [emailAddress, emailPassword],
  enforceAppCheck: true,
}).https.onCall(async (data: EmailData, context) => {
  if (context.app == undefined) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called from an App Check verified app.");
  }

  const {
    name,
    email,
    countryCode,
    countryName,
    phone,
    note,
    emailTo,
  } = data;

  const senderEmail = emailAddress.value();

  const transporter = nodemailer.createTransport({
    service: "hotmail",
    auth: {
      user: senderEmail,
      pass: emailPassword.value(),
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${senderName.value()}" <${senderEmail}>`,
      to: emailTo,
      subject: "!!!DO NOT REPLY THIS EMAIL!!! - New form submission from website",
      html: `
        <h1>Submission information</h1>
  
        <h2>Name</h2>
        <p>${name.trim()}</p>
  
        <h2>Phone number</h2>
        <p>[${countryCode.toUpperCase()}-${countryName}] +${phone.trim()}</p>
  
        <h2>Email</h2>
        <p>${email.trim().toLowerCase()}</p>
  
        <h2>Note</h2>
        <p style="white-space: pre-wrap;">${note}</p>
      `,
    });

    functions.logger.info("email sended", {
      messageId: info.messageId,
    });

    return {acknowledge: true};
  } catch (error) {
    functions.logger.error("unable to send email", {
      error,
      name,
      email,
      countryCode,
      countryName,
      phone,
      note,
      emailTo,
    });

    throw new functions.https.HttpsError("unknown", "something went wrong");
  }
});
