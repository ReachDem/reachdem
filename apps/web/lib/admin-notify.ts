import { createSmtpTransport, getSmtpSenderEmail } from "./smtp";

export async function notifyAdminsOfValidationRequest(
  type: "Sender ID" | "Organization",
  details: string
) {
  try {
    const transport = createSmtpTransport();
    const senderEmail = getSmtpSenderEmail();
    const adminEmails = ["latioms@gmail.com", "ronaldkamgaing4@gmail.com"];

    const subject = `New ${type} Validation Request`;
    const message = `A new validation request for ${type} has been submitted.\n\nDetails:\n${details}`;

    await transport.sendMail({
      from: `ReachDem Admin <${senderEmail}>`,
      to: adminEmails,
      subject,
      text: message,
    });

    console.log(`Notified admins of ${type} request`);
  } catch (error) {
    console.error(`Failed to notify admins of ${type} request:`, error);
  }
}
