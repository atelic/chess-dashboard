import { Resend } from 'resend';

/**
 * Email service using Resend
 * 
 * Environment variables required:
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM: The sender email address (must be verified in Resend)
 * - NEXTAUTH_URL: The base URL for reset links
 */

// Initialize Resend client (lazy initialization for Edge compatibility)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  
  return resendClient;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Get the sender email address
 */
function getSenderEmail(): string {
  return process.env.EMAIL_FROM || 'Chess Dashboard <noreply@chessdashboard.com>';
}

/**
 * Get the base URL for the app
 */
function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();
  
  if (!client) {
    // Log to console in development when Resend is not configured
    const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
    console.log('='.repeat(60));
    console.log('PASSWORD RESET EMAIL (Resend not configured)');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('='.repeat(60));
    return { success: true };
  }

  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  try {
    const { error } = await client.emails.send({
      from: getSenderEmail(),
      to: email,
      subject: 'Reset your Chess Dashboard password',
      html: getPasswordResetEmailHtml(resetUrl),
      text: getPasswordResetEmailText(resetUrl),
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending password reset email:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to send email' 
    };
  }
}

/**
 * Send a welcome email after registration
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();
  
  if (!client) {
    // Log to console in development when Resend is not configured
    console.log('='.repeat(60));
    console.log('WELCOME EMAIL (Resend not configured)');
    console.log(`To: ${email}`);
    console.log(`Name: ${name || 'New User'}`);
    console.log('='.repeat(60));
    return { success: true };
  }

  try {
    const { error } = await client.emails.send({
      from: getSenderEmail(),
      to: email,
      subject: 'Welcome to Chess Dashboard!',
      html: getWelcomeEmailHtml(name),
      text: getWelcomeEmailText(name),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to send email' 
    };
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function getPasswordResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
          <tr>
            <td style="padding: 40px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #fafafa; font-size: 24px; font-weight: bold; margin: 0;">
                  Chess Dashboard
                </h1>
              </div>
              
              <!-- Content -->
              <div style="margin-bottom: 32px;">
                <h2 style="color: #fafafa; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
                  Reset Your Password
                </h2>
                <p style="color: #a1a1aa; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
                  You requested to reset your password. Click the button below to create a new password. This link will expire in 24 hours.
                </p>
                
                <!-- Button -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="${resetUrl}" 
                         style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Alternative Link -->
              <div style="margin-bottom: 32px; padding: 16px; background-color: #27272a; border-radius: 8px;">
                <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0 0 8px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="color: #60a5fa; font-size: 14px; word-break: break-all; margin: 0;">
                  ${resetUrl}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="border-top: 1px solid #27272a; padding-top: 24px;">
                <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0;">
                  If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function getPasswordResetEmailText(resetUrl: string): string {
  return `
Reset Your Password

You requested to reset your Chess Dashboard password. Click the link below to create a new password. This link will expire in 24 hours.

Reset Password: ${resetUrl}

If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.

- Chess Dashboard Team
`.trim();
}

function getWelcomeEmailHtml(name?: string): string {
  const greeting = name ? `Hi ${name}` : 'Welcome';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Chess Dashboard</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
          <tr>
            <td style="padding: 40px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #fafafa; font-size: 24px; font-weight: bold; margin: 0;">
                  Chess Dashboard
                </h1>
              </div>
              
              <!-- Content -->
              <div style="margin-bottom: 32px;">
                <h2 style="color: #fafafa; font-size: 20px; font-weight: 600; margin: 0 0 16px;">
                  ${greeting}!
                </h2>
                <p style="color: #a1a1aa; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
                  Thanks for signing up for Chess Dashboard! You're all set to start analyzing your chess games.
                </p>
                <p style="color: #a1a1aa; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
                  Connect your Chess.com and/or Lichess accounts to import your games and gain insights into your playing patterns.
                </p>
                
                <!-- Features -->
                <div style="margin-bottom: 24px;">
                  <p style="color: #fafafa; font-size: 16px; font-weight: 600; margin: 0 0 12px;">
                    What you can do:
                  </p>
                  <ul style="color: #a1a1aa; font-size: 14px; line-height: 24px; margin: 0; padding-left: 20px;">
                    <li>Analyze your openings and find weaknesses</li>
                    <li>Track your rating progress over time</li>
                    <li>Identify patterns in your wins and losses</li>
                    <li>Get personalized improvement suggestions</li>
                  </ul>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="border-top: 1px solid #27272a; padding-top: 24px;">
                <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0;">
                  Happy analyzing! If you have any questions, feel free to reach out.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function getWelcomeEmailText(name?: string): string {
  const greeting = name ? `Hi ${name}` : 'Welcome';
  
  return `
${greeting}!

Thanks for signing up for Chess Dashboard! You're all set to start analyzing your chess games.

Connect your Chess.com and/or Lichess accounts to import your games and gain insights into your playing patterns.

What you can do:
- Analyze your openings and find weaknesses
- Track your rating progress over time
- Identify patterns in your wins and losses
- Get personalized improvement suggestions

Happy analyzing!

- Chess Dashboard Team
`.trim();
}
