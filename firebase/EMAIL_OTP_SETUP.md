# Email OTP Setup Guide

This guide explains how to configure email OTP authentication for HomeServices apps.

## Overview

Email OTP authentication allows users to login using their email address and a 6-digit OTP code sent to their email. This is implemented using Firebase Cloud Functions with nodemailer.

## Prerequisites

1. Firebase project with Cloud Functions enabled
2. Billing enabled (Blaze plan required for Cloud Functions)
3. Email service provider (Gmail SMTP or custom SMTP)

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd HomeServicesProvider/firebase/functions
npm install
```

This will install `nodemailer` and other required dependencies.

### Step 2: Configure Email Settings

Choose one of the following options:

#### Option A: Gmail SMTP (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Set Firebase Functions Config:**
   ```bash
   cd HomeServicesProvider/firebase
   firebase functions:config:set email.gmail_user="your-email@gmail.com"
   firebase functions:config:set email.gmail_password="your-app-password"
   firebase functions:config:set email.from="HomeServices <your-email@gmail.com>"
   ```

#### Option B: Custom SMTP (Recommended for Production)

1. **Get SMTP credentials** from your email service provider (e.g., SendGrid, Mailgun, AWS SES)

2. **Set Firebase Functions Config:**
   ```bash
   cd HomeServicesProvider/firebase
   firebase functions:config:set email.smtp_host="smtp.sendgrid.net"
   firebase functions:config:set email.smtp_port="587"
   firebase functions:config:set email.smtp_secure="false"
   firebase functions:config:set email.smtp_user="apikey"
   firebase functions:config:set email.smtp_password="your-sendgrid-api-key"
   firebase functions:config:set email.from="HomeServices <noreply@homeservices.com>"
   ```

### Step 3: Build and Deploy Cloud Functions

```bash
cd HomeServicesProvider/firebase/functions
npm run build
cd ..
firebase deploy --only functions:sendEmailOTP,functions:verifyEmailOTP
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

### Step 4: Verify Deployment

1. Check Firebase Console → Functions to see deployed functions
2. Test email OTP in the app:
   - Open LoginScreen
   - Select "Email" tab
   - Enter email address
   - Click "Send Code"
   - Check email for OTP code
   - Enter code and verify

## How It Works

1. **User requests OTP:**
   - App calls `sendEmailOTP` Cloud Function
   - Function generates 6-digit OTP
   - OTP stored in Firestore `emailOTPs` collection with expiration (10 minutes)
   - Email sent via nodemailer

2. **User verifies OTP:**
   - App calls `verifyEmailOTP` Cloud Function with email and code
   - Function verifies code and expiration
   - If valid, creates/signs in user and returns custom token
   - App signs in with custom token

## Security Features

- ✅ OTP expires in 10 minutes
- ✅ Maximum 5 verification attempts per OTP
- ✅ OTP deleted after successful verification
- ✅ Rate limiting (handled by Firebase Functions)
- ✅ Email validation

## Troubleshooting

### Email Not Sending

1. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log --only sendEmailOTP
   ```

2. **Verify email configuration:**
   ```bash
   firebase functions:config:get
   ```

3. **Common issues:**
   - Gmail: Make sure 2FA is enabled and app password is correct
   - SMTP: Verify host, port, and credentials
   - Firewall: Ensure Cloud Functions can access SMTP server

### OTP Not Verifying

1. **Check expiration:** OTP expires after 10 minutes
2. **Check attempts:** Maximum 5 failed attempts per OTP
3. **Check logs:** `firebase functions:log --only verifyEmailOTP`

## Production Recommendations

1. **Use Custom SMTP** (not Gmail) for production
2. **Set up email domain** (e.g., `noreply@homeservices.com`)
3. **Monitor email delivery rates**
4. **Set up email templates** for better branding
5. **Implement rate limiting** per email address
6. **Add email verification** before allowing login

## Cost Considerations

- **Cloud Functions:** Free tier includes 2M invocations/month
- **Email Service:** 
  - Gmail: Free (limited to 500 emails/day)
  - SendGrid: Free tier includes 100 emails/day
  - AWS SES: $0.10 per 1,000 emails

## Notes

- Phone OTP continues to work via Firebase Phone Authentication (no changes needed)
- Email OTP is an additional option, not a replacement
- Users can choose between Phone or Email login methods

