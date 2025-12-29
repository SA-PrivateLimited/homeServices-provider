# Phone Authentication Setup Guide

## For Testing: Setting Up Test Phone Numbers in Firebase

Firebase allows you to add test phone numbers that automatically verify with a test code (usually "123456").

### Steps to Add Test Phone Numbers:

1. **Go to Firebase Console:**
   - Navigate to: https://console.firebase.google.com/project/home-services-1ea69/authentication/providers
   - Click on **Phone** provider
   - Scroll down to **Phone numbers for testing**

2. **Add Test Number:**
   - Click **Add phone number**
   - Enter phone number in E.164 format (e.g., `+919876543210`)
   - Enter test code (default: `123456`)
   - Click **Save**

3. **Test Phone Numbers:**
   - Use the exact phone number you added (with country code)
   - When prompted for OTP, enter the test code you configured (e.g., `123456`)
   - The verification will succeed immediately

## Common Issues and Solutions

### Issue 1: "Invalid verification code"
**Solution:**
- For test numbers: Use the exact test code configured in Firebase Console
- For real numbers: Check SMS for the actual 6-digit code
- Ensure you're entering the code within the expiration time (usually 5-10 minutes)

### Issue 2: "Code expired"
**Solution:**
- Request a new verification code
- Test codes don't expire, but real codes expire after a few minutes

### Issue 3: "Too many requests"
**Solution:**
- Wait a few minutes before trying again
- Use a different phone number for testing
- For test numbers, this shouldn't happen

### Issue 4: "Verification session expired"
**Solution:**
- Request a new verification code
- Don't wait too long between requesting code and verifying

## Testing Checklist

- [ ] Test phone number added to Firebase Console
- [ ] Phone number format is correct (E.164: +91XXXXXXXXXX)
- [ ] Test code configured (default: 123456)
- [ ] App is using the correct Firebase project
- [ ] Phone authentication is enabled in Firebase Console

## Debugging

Check console logs for:
- `📱 [SEND CODE]` - Code sending process
- `✅ [SEND CODE]` - Code sent successfully
- `📱 [VERIFY]` - Code verification process
- `✅ [VERIFY]` - Code verified successfully
- `❌ [VERIFY]` - Verification errors

## Real Phone Numbers

For real phone numbers (not test):
1. Enter phone number with country code
2. Wait for SMS with 6-digit code
3. Enter the code from SMS
4. Code expires after 5-10 minutes

## Note

- Test numbers only work in development/testing
- Real phone numbers require SMS delivery
- Rate limiting applies to real numbers (not test numbers)
