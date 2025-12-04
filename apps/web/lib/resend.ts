import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "ReachDem <notification@updates.reachdem.cc>";

interface SendOTPEmailParams {
  to: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password";
}

export async function sendOTPEmail({ to, otp, type }: SendOTPEmailParams) {
  const subjects = {
    "sign-in": "Votre code de connexion ReachDem",
    "email-verification": "Vérifiez votre adresse email - ReachDem",
    "forget-password": "Réinitialisation de votre mot de passe - ReachDem",
  };

  const titles = {
    "sign-in": "Code de connexion",
    "email-verification": "Vérification d'email",
    "forget-password": "Réinitialisation du mot de passe",
  };

  const descriptions = {
    "sign-in": "Utilisez ce code pour vous connecter à votre compte ReachDem.",
    "email-verification":
      "Utilisez ce code pour vérifier votre adresse email et activer votre compte ReachDem.",
    "forget-password":
      "Utilisez ce code pour réinitialiser votre mot de passe ReachDem.",
  };

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: subjects[type],
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjects[type]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0a0a0a;">
                ReachDem
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #0a0a0a;">
                ${titles[type]}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                ${descriptions[type]}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Ce code expire dans 5 minutes. Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} ReachDem. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send verification email");
  }

  return data;
}
