import os
import re
from datetime import datetime
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "").strip()
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@atlas-recruitment.edu")

# Ensure logs directory exists
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", "mail")
os.makedirs(LOGS_DIR, exist_ok=True)

def send_html_email(to_email: str, subject: str, title: str, content: str, action_url: str = None, action_text: str = None) -> bool:
    """
    Sends a styled HTML email using SendGrid. 
    Falls back to writing to local HTML logs if no SendGrid API key is configured.
    """
    # Cyber Neon HTML template
    action_button_html = ""
    if action_url and action_text:
        action_button_html = f'''
        <div style="text-align: center; margin: 30px 0;">
            <a href="{action_url}" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4); display: inline-block;">
                {action_text}
            </a>
        </div>
        '''

    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; color: #e2e8f0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19;">
        <tr>
            <td align="center" style="padding: 40px 0 30px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #111827; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0; background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border-bottom: 2px solid #00f2fe;">
                            <span style="font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #00f2fe; text-shadow: 0 0 10px rgba(0, 242, 254, 0.5);">
                                ATLAS
                            </span>
                            <div style="font-size: 12px; color: #f43f5e; letter-spacing: 3px; font-weight: bold; margin-top: 5px; text-transform: uppercase;">
                                Placement Coordinator System
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-size: 20px; font-weight: bold; color: #ffffff; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
                                        {title}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 0 10px 0; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                                        {content}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        {action_button_html}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #0d1117; border-top: 1px solid #1e293b; font-size: 12px; text-align: center; color: #64748b;">
                            <p style="margin: 0 0 10px 0;">You are receiving this because you are a registered user of the ATLAS Campus Placement Cell.</p>
                            <p style="margin: 0;">© {datetime.now().year} ATLAS System. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''

    # Fallback to local logs
    if not SENDGRID_API_KEY:
        safe_subject = re.sub(r'[^a-zA-Z0-9_\-]', '_', subject)
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{to_email.split('@')[0]}_{safe_subject}.html"
        filepath = os.path.join(LOGS_DIR, filename)
        
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"[MAIL LOG] Written mock email to {filepath}")
            return True
        except Exception as e:
            print(f"[MAIL LOG ERROR] Failed to write mock email: {str(e)}")
            return False

    # Standard SendGrid API call
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code in [200, 201, 202]
    except Exception as e:
        print(f"SendGrid Error sending mail: {str(e)}")
        # Secondary fallback
        print("[MAIL FALLBACK] Writing to logs instead.")
        filepath = os.path.join(LOGS_DIR, f"fallback_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{to_email.split('@')[0]}.html")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        return False
