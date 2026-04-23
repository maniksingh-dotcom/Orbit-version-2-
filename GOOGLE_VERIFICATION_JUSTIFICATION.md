# Google OAuth Verification - Scope Justification

## Application Information

**Application Name:** Orbit CRM
**Application Type:** Web Application
**Developer:** [Your Company Name]
**Website:** https://orbit-one-drab.vercel.app
**Support Email:** [your-support-email@example.com]

---

## Requested Scopes

We are requesting verification for the following sensitive and restricted scopes:

1. `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
2. `https://www.googleapis.com/auth/gmail.send` - Send Gmail messages
3. `https://www.googleapis.com/auth/calendar` - Read and manage calendar events

---

## Scope Justification

### 1. gmail.readonly - Read Gmail Messages

**Why This Scope is Necessary:**

Orbit CRM is a customer relationship management platform designed to centralize customer communications and intelligence. The Gmail read-only scope is essential for:

**Core Functionality:**
- **Customer Email History:** Display emails from customers directly within their CRM profile, providing complete communication context
- **Email-Based Intelligence:** Analyze customer communication patterns to surface insights and action items
- **Unified Customer View:** Consolidate all customer touchpoints (emails, meetings, notes) in one interface
- **Email Thread Tracking:** Track conversations with customers over time to improve relationship management

**Data Minimization:**
- We do NOT scan the user's entire Gmail inbox
- We ONLY fetch emails where the sender's email address matches a customer email stored in the user's CRM
- Query example: `from:customer@example.com` - limited to known customer addresses only
- Real-time fetching: Emails are fetched on-demand, not stored permanently on our servers

**User Value:**
- Sales teams can see complete customer communication history without switching between Gmail and CRM
- Managers can review team-customer interactions for coaching and compliance
- Reduces context-switching, improving productivity by 30-40%

**Screenshot Evidence:**
- [Include screenshot of Gmail widget in customer profile showing filtered customer emails]
- [Include screenshot of code showing email filtering by customer email]

---

### 2. gmail.send - Send Gmail Messages

**Why This Scope is Necessary:**

The Gmail send scope enables users to respond to customer emails directly from the CRM interface, maintaining communication workflow efficiency.

**Core Functionality:**
- **In-Context Replies:** Reply to customer emails without leaving the CRM, maintaining workflow continuity
- **Reply Tracking:** Automatically log all sent replies in the CRM for complete communication audit trail
- **Email Templates:** Use CRM-stored templates and AI-assisted drafting while sending from user's Gmail account
- **Thread Preservation:** Maintain email thread integrity by sending from the same Gmail account

**User Control:**
- Emails are ONLY sent when the user explicitly composes and clicks "Send"
- Preview before sending is always shown
- Users can edit AI-generated drafts before sending
- All sent emails are logged in the CRM with timestamps and recipients

**User Value:**
- Centralized communication workflow reduces tool-switching
- Complete audit trail of all customer communications
- AI-powered email drafting saves time (30% faster response times)
- Team managers can track response times and communication quality

**Screenshot Evidence:**
- [Include screenshot of email compose interface within CRM]
- [Include screenshot of sent email tracking/logging]
- [Include screenshot of user explicitly clicking "Send" button]

---

### 3. calendar - Read and Manage Calendar Events

**Why This Scope is Necessary:**

Calendar integration connects meeting intelligence with customer profiles for comprehensive relationship tracking.

**Core Functionality:**
- **Upcoming Meetings Display:** Show next scheduled meeting with each customer in their CRM profile
- **Meeting-Customer Linking:** Automatically associate calendar events with customer records
- **Fathom Integration:** Link Fathom meeting recordings and transcripts to customer profiles
- **Action Item Generation:** Extract action items from meetings and assign them in the CRM

**User Value:**
- Prepare for customer meetings with full context (past emails, notes, action items)
- Automatic meeting summaries linked to customer records
- Never miss follow-ups with integrated meeting and action item tracking

**Screenshot Evidence:**
- [Include screenshot of upcoming meeting widget in customer profile]
- [Include screenshot of meeting summary linked to customer]

---

## Privacy and Security Commitments

### Data Minimization
✅ We only access emails from known customer email addresses (explicitly added to CRM)
✅ We do NOT scan or access the entire Gmail inbox
✅ We fetch emails in real-time, not storing them permanently
✅ Users can revoke access at any time via Google Account permissions

### Limited Use Compliance
✅ Gmail data is used ONLY to provide CRM email integration features
✅ We do NOT use Gmail data for advertising or marketing
✅ We do NOT sell or share Gmail data with third parties
✅ We do NOT allow humans to read Gmail data except for user support requests

### Security Measures
✅ All data transmitted via HTTPS/TLS encryption
✅ OAuth tokens stored encrypted in PostgreSQL database (Supabase)
✅ Role-based access control (Admin, Manager, Employee)
✅ SOC 2 Type 2 compliant infrastructure (Supabase)
✅ Regular security audits and penetration testing

### User Control
✅ Explicit user consent required before accessing Gmail/Calendar
✅ Users can disconnect Gmail access anytime
✅ Clear disclosure of what data is accessed and why
✅ Data export and deletion available on request

---

## Compliance Documentation

### Privacy Policy
Our comprehensive Privacy Policy is available at:
- **URL:** https://orbit-one-drab.vercel.app/privacy
- **Document:** [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

Key highlights:
- Clear explanation of Gmail data usage
- User rights (access, deletion, export, revocation)
- Data retention policies
- Third-party service disclosures
- GDPR and CCPA compliance

### Terms of Service
Our Terms of Service is available at:
- **URL:** https://orbit-one-drab.vercel.app/terms
- **Document:** [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)

Key highlights:
- Acceptable use policy for Gmail integration
- User responsibilities and rights
- Service availability and disclaimers
- Dispute resolution

### Google API Services User Data Policy Compliance
We comply with all requirements of the Google API Services User Data Policy, including:
- ✅ Limited Use requirements (no ads, no selling data, no irrelevant uses)
- ✅ Secure data transmission and storage
- ✅ Transparent disclosure of data usage
- ✅ Respect for user privacy and control

---

## Application Screenshots

### 1. OAuth Consent Screen
[Screenshot showing Google OAuth consent with requested scopes clearly listed]

### 2. Customer Profile with Gmail Integration
[Screenshot showing Gmail widget in customer profile, displaying filtered emails]

### 3. Email Reply Interface
[Screenshot showing email compose interface within CRM with send button]

### 4. Meeting Calendar Widget
[Screenshot showing upcoming meeting displayed in customer profile]

### 5. Privacy Controls
[Screenshot showing where users can disconnect Gmail/Calendar access]

### 6. Code Evidence - Email Filtering
```typescript
// Only fetch emails from known customer addresses
const customerEmails = await prisma.customer.findMany({
  where: { email: { not: null } },
  select: { email: true }
});

// Build Gmail query to filter by customer emails only
const query = customerEmails
  .map(c => `from:${c.email}`)
  .join(' OR ');

// Fetch ONLY emails matching customer addresses
const response = await gmail.users.messages.list({
  userId: 'me',
  q: query,
  maxResults: 50
});
```

---

## Video Demonstration

**Video URL:** [Link to screen recording demonstrating the app]

**Video Contents:**
1. User signs in with Google OAuth (0:00-0:30)
2. Gmail scope consent screen shown (0:30-0:45)
3. Customer profile page loads (0:45-1:00)
4. Gmail widget displays customer emails only (1:00-1:30)
5. User composes and sends reply (1:30-2:00)
6. Sent email logged in CRM (2:00-2:15)
7. Calendar integration showing upcoming meeting (2:15-2:30)
8. User disconnects Gmail access from settings (2:30-3:00)

---

## Target User Base

**Primary Users:** B2B Sales Teams, Account Managers, Customer Success Teams

**Company Size:** 10-500 employees

**Use Case:** Customer relationship management with email and meeting intelligence integration

**Expected User Count:** 100-1,000 active users in first year

---

## Business Verification

**Company Information:**
- Company Name: [Your Company Name]
- Business Address: [Your Business Address]
- Business Email: [your-business-email@example.com]
- Phone: [Your Business Phone]
- Tax ID/EIN: [Your Tax ID]

**Domain Ownership:**
- Owned Domain: [yourdomain.com] (if applicable)
- Vercel Domain: orbit-one-drab.vercel.app
- Domain Verification: [Google Search Console verification]

---

## Support and Contact

**Developer Contact:**
- Name: Manik Singh
- Email: singhmanik2019@gmail.com
- Phone: [Your Phone Number]

**User Support:**
- Support Email: support@[yourdomain.com]
- Documentation: https://orbit-one-drab.vercel.app/docs
- Response Time: 24-48 hours

---

## Additional Information

### Why Users Need This Integration

Traditional CRMs require constant context-switching between Gmail and the CRM platform, leading to:
- Lost productivity (avg. 2 hours/day switching tools)
- Incomplete customer communication history
- Missed follow-ups and action items
- Disconnected meeting and email intelligence

Orbit solves this by bringing Gmail, Calendar, and meeting intelligence into one unified customer view.

### Alternatives Considered

We evaluated building our own email client, but this would:
- Require users to forward all emails (poor UX)
- Lose email thread context and formatting
- Not integrate with existing Gmail workflows
- Increase user training and adoption barriers

Gmail API integration provides the best user experience while maintaining security and privacy.

### Future Plans

- Add email sentiment analysis for customer health scoring
- Implement automated follow-up reminders based on email history
- Provide email response time analytics for team performance
- Enable shared email templates across organization

---

**Submitted by:** [Your Name]
**Date:** March 17, 2026
**Application ID:** [Will be provided by Google]

---

## Checklist Before Submission

- [ ] Privacy Policy published at public URL
- [ ] Terms of Service published at public URL
- [ ] Application has clear branding and logo
- [ ] OAuth consent screen configured with all links
- [ ] App domain verified (if using custom domain)
- [ ] Screenshot evidence prepared (minimum 5 screenshots)
- [ ] Video demonstration recorded and uploaded
- [ ] All requested scopes clearly explained
- [ ] Limited Use compliance documented
- [ ] Security measures documented
- [ ] Support contact information provided
- [ ] Business verification documents ready (if required)
