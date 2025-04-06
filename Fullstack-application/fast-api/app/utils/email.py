import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

def send_email(to_email, subject, html_content):
    """
    Send an email using SMTP
    """
    # Get email configuration from environment variables
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    sender_email = os.getenv("SENDER_EMAIL", "noreply@example.com")
    
    # If SMTP settings are not configured, log the email details and return
    if not smtp_host or not smtp_username or not smtp_password:
        logger.warning("SMTP not configured. Email would have been sent:")
        logger.warning(f"To: {to_email}")
        logger.warning(f"Subject: {subject}")
        logger.warning(f"Content: {html_content}")
        
        # Return early - we'll still log the email details but not try to send
        return True
    
    # Create a multipart message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = to_email

    # Create HTML version of the message
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)

    # Add plain text alternative
    plain_text = html_content.replace('<p>', '').replace('</p>', '\n\n').replace('<br>', '\n')
    plain_text = ''.join([i if ord(i) < 128 else ' ' for i in plain_text])
    text_part = MIMEText(plain_text, "plain")
    message.attach(text_part)

    server = None
    try:
        logger.info(f"Attempting to send email to {to_email} via {smtp_host}:{smtp_port}")
        # Create SMTP session
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()  # Secure the connection
        
        # Log in to SMTP server
        server.login(smtp_username, smtp_password)
        logger.debug(f"Successfully logged in to SMTP server as {smtp_username}")
        
        # Send email
        server.sendmail(sender_email, to_email, message.as_string())
        logger.info(f"Email sent successfully to {to_email}")
        
        return True
    
    except smtplib.SMTPAuthenticationError:
        logger.error(f"SMTP Authentication Error: Failed to authenticate with {smtp_host} using username {smtp_username}")
        logger.error("Check your SMTP_USERNAME and SMTP_PASSWORD in .env file")
        return False
    except smtplib.SMTPConnectError:
        logger.error(f"SMTP Connection Error: Failed to connect to {smtp_host}:{smtp_port}")
        logger.error("Check your SMTP_HOST and SMTP_PORT in .env file and ensure the server is reachable")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False
    finally:
        if server:
            try:
                server.quit()
            except:
                pass

def send_verification_email(to_email, token):
    """
    Send verification email with the verification link
    """
    # Get frontend URL from environment variable or use default
    frontend_url = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    verification_url = f"{frontend_url}/verify-email?token={token}"
    
    subject = "Verify Your Email Address"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4299e1; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .button {{ background-color: #4299e1; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Email Verification</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="{verification_url}" class="button">Verify Email</a>
                </p>
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p>{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; {2024} Your Company. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    success = send_email(to_email, subject, html_content)
    if success:
        logger.info(f"Verification email sent to {to_email}")
    else:
        logger.error(f"Failed to send verification email to {to_email}")
    return success

def send_password_reset_email(to_email, token):
    """
    Send password reset email with the reset link
    """
    # Get frontend URL from environment variable or use default
    frontend_url = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    subject = "Reset Your Password"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4299e1; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .button {{ background-color: #4299e1; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p>{reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; {2024} Your Company. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    success = send_email(to_email, subject, html_content)
    if success:
        logger.info(f"Password reset email sent to {to_email}")
    else:
        logger.error(f"Failed to send password reset email to {to_email}")
    return success 