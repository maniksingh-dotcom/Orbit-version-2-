# Privacy Policy for Orbit CRM

**Last Updated:** March 17, 2026

## Introduction

Orbit ("we," "our," or "us") operates the Orbit CRM platform (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.

## Information We Collect

### Information You Provide
- **Account Information:** Name, email address, profile picture (from Google OAuth)
- **Customer Data:** Customer profiles, contact information, notes, documents, and meeting recordings you upload
- **User-Generated Content:** Notes, comments, action items, and other content you create within the Service

### Information Collected Automatically
- **Usage Data:** Log data, IP address, browser type, pages visited, time spent on pages
- **Cookies:** We use cookies and similar tracking technologies to track activity on our Service

### Information from Third-Party Services
- **Google Account Data:**
  - Basic profile information (name, email, profile picture)
  - Calendar events (to show upcoming meetings)
  - Gmail messages (to display customer email communications)
  - OAuth tokens (to maintain authenticated access)

## How We Use Your Information

We use the collected information to:

1. **Provide and Maintain the Service:**
   - Authenticate users and manage accounts
   - Display your customer data, notes, and documents
   - Enable collaboration features (team notes, deal rooms, action items)

2. **Email Integration:**
   - Display emails from your customers within the CRM
   - Send replies to customer emails directly from the platform
   - Track email communication history with customers
   - **We only access emails from customers you've added to your CRM**

3. **Calendar Integration:**
   - Show upcoming meetings with customers
   - Link meeting summaries to customer profiles
   - Display Fathom meeting intelligence data

4. **Improve Our Service:**
   - Analyze usage patterns to improve features
   - Debug errors and optimize performance
   - Develop new features based on user needs

## Gmail Scope Usage Justification

### Scopes Requested:
- `https://www.googleapis.com/auth/gmail.readonly` - Read-only access to Gmail
- `https://www.googleapis.com/auth/gmail.send` - Send emails on user's behalf

### Why We Need These Scopes:

**gmail.readonly:**
- To fetch and display emails from customers in your CRM
- To provide context about customer communications within the platform
- To enable email-based customer intelligence and insights
- **Limited Access:** We only query emails from customer email addresses you've explicitly added to your CRM

**gmail.send:**
- To enable users to reply to customer emails directly from the CRM interface
- To maintain conversation threads and track communication history
- To improve workflow efficiency by centralizing customer communications
- **User Control:** Emails are only sent when you explicitly compose and send them through our interface

### Data Minimization:
- We do NOT scan or access your entire Gmail inbox
- We ONLY fetch emails where the sender matches a customer email address in your CRM
- We do NOT store email content on our servers (emails are fetched in real-time from Gmail)
- We do NOT use email data for advertising or marketing purposes
- We do NOT share email data with third parties

## How We Protect Your Information

### Security Measures:
- **Encryption:** All data transmitted between your browser and our servers is encrypted using HTTPS/TLS
- **Authentication:** Secure OAuth 2.0 authentication with Google
- **Database Security:** PostgreSQL database hosted on Supabase with encryption at rest
- **Access Control:** Role-based access control (Admin, Manager, Employee)
- **Token Storage:** OAuth tokens are encrypted and stored securely in our database

### Data Storage:
- **Database:** Supabase (PostgreSQL) - SOC 2 Type 2 certified, GDPR compliant
- **File Storage:** Supabase Storage with encryption
- **Location:** All data stored in secure cloud infrastructure

## Data Sharing and Disclosure

We DO NOT sell, trade, or rent your personal information to third parties.

We may share information only in the following circumstances:

1. **With Your Consent:** When you explicitly authorize us to share information
2. **Service Providers:** With third-party services that help us operate (Supabase, Vercel, OpenAI for AI features)
3. **Legal Requirements:** When required by law, court order, or government request
4. **Business Transfers:** In the event of a merger, acquisition, or sale of assets

### Third-Party Services We Use:
- **Supabase:** Database and file storage hosting
- **Vercel:** Application hosting
- **Google APIs:** Gmail and Calendar integration
- **OpenAI:** AI-powered features (note summarization, email drafts)
- **Fathom:** Meeting intelligence integration

## Your Data Rights

You have the right to:

1. **Access:** Request a copy of your personal data
2. **Correction:** Update or correct inaccurate information
3. **Deletion:** Request deletion of your account and associated data
4. **Portability:** Export your data in a machine-readable format
5. **Revoke Access:** Disconnect Gmail/Calendar access at any time via Google Account settings
6. **Opt-Out:** Disable specific features (AI insights, email integration)

### How to Exercise Your Rights:
- **Delete Account:** Contact us at singhmanik2019@gmail.com
- **Revoke Gmail Access:** Visit [Google Account Permissions](https://myaccount.google.com/permissions)
- **Export Data:** Request data export by contacting support

## Data Retention

- **Active Accounts:** We retain your data while your account is active
- **Deleted Accounts:** Data is permanently deleted within 30 days of account deletion
- **OAuth Tokens:** Refreshed automatically; invalidated immediately upon revocation
- **Backups:** Backup data is retained for 30 days for disaster recovery

## Children's Privacy

Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## International Data Transfers

Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of changes by:
- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date
- Sending an email notification for material changes

## Contact Us

If you have questions about this Privacy Policy or our data practices:

**Email:** singhmanik2019@gmail.com
**Address:** [Your Business Address]

## Compliance

This Privacy Policy complies with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Google API Services User Data Policy
- Google OAuth 2.0 Policies

## Google API Disclosure

Orbit's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

**Limited Use Commitment:**
- We only use Gmail data to provide email integration features within Orbit CRM
- We do NOT use Gmail data for serving advertisements
- We do NOT allow humans to read Gmail data unless necessary for security purposes, to comply with applicable law, or when you give explicit consent
- We do NOT transfer Gmail data to third parties except as necessary to provide the Service
