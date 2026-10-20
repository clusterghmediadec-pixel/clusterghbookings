# ClusterGh Photography booking system

This Apps Script project creates the Google Form, its linked booking spreadsheet, the private booking calendar, the availability workflow, and a branded client booking page. The web admin dashboard has been disabled; booking requests and status updates are sent directly to both business WhatsApp numbers through the Meta Cloud API when configured. It does not set prices, accept payments, reserve a slot on request, or claim a WhatsApp message was delivered unless Meta returns a success response.

## What's implemented

- Google Form: **ClusterGh Photography — Official Shoot Booking Form**
- Linked response database: **ClusterGh Photography — Booking Management**
- Dedicated calendar: **ClusterGh Photography Bookings**
- Unique `CLG-YYYY-00001` references, duplicate-request flagging, validation, notification delivery statuses and failure logs
- Availability checks against calendar events, configured work days/hours, breaks, blocked dates, appointment duration and buffer
- Calendar events only after an authorized staff member changes a booking's status to **Confirmed** or **Scheduled**; the slot is checked again before creation
- Status list: Pending, Confirmed, Deposit Paid, Partially Paid, Fully Paid, Scheduled, Completed, Cancelled, Rescheduled, No-show
- Responsive public booking page in `Index.html`, using the same server-side validation and booking workflow as the Google Form
- After a customer submits a session request, save it and open one prefilled WhatsApp chat to WhatsApp 1 (`+233 24 186 6720`)
- Parallel WhatsApp Cloud API notifications for each new request to both business numbers, with individual recipient results and failure logs
- Automatic WhatsApp Cloud API status notifications to the client and both business numbers when a booking status changes
- Manual retry action for failed or unconfigured request and status notifications; messages accepted by Meta are not resent

Google Forms cannot show live calendar availability. Every submission is a request only. A “calendar clear” result is not a reservation or confirmation.

## Live customer links

- Customer booking page: https://script.google.com/macros/s/AKfycbxwJ3VCOHLQkCgikZPX5HTXHDWg_hEgWWnBHkuvoa9gd8CtUkypo-uXTGoUilCIIhLF/exec
- Google Form responder: https://docs.google.com/forms/d/e/1FAIpQLSfHrYad_OiS53A5FI4fBRCeg3YaSN-Gp7R5jkpxhBF92im_jQ/viewform
- Private booking spreadsheet: https://docs.google.com/spreadsheets/d/1DJ4gW5lzSh8QhP0rpNcFuxLTp1shFHb6VPGajNYkI_Y/edit

The Apps Script web app is deployed as the owner for **Anyone** access and serves only the customer booking page. Do not share the private spreadsheet or calendar publicly. This version has no web admin dashboard; authorized staff manage requests in the restricted spreadsheet.

The website shows only one WhatsApp contact: `+233 24 186 6720`. The header and contact link open a general WhatsApp chat and do not create a spreadsheet booking by themselves. To save a booking request and generate its reference, submit **Submit Booking**; the page opens that same WhatsApp chat with the full request prefilled. The customer must press **Send** in WhatsApp. Click-to-chat cannot silently send messages. The Google Form remains a separate submission route and does not automatically open WhatsApp.

## Existing Google components and updating the deployment

The Form, linked spreadsheet, booking calendar, triggers, and public web app have already been created in the Google account above. **Do not run `createClusterGhBookingSystem` again in this existing project**; it intentionally stops when it detects the existing setup. Use the live links above.

To publish a source update, open the existing **ClusterGh Photography Booking System** project at [script.google.com](https://script.google.com), update `Code.gs` and `Index.html`, save, then use **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the existing web-app deployment and access setting. Confirm the resulting deployment URL and load it in a browser. Google Apps Script runs as the owner and requires any newly requested Google-service permissions to be approved by that account.

For a genuinely new Apps Script project only, upload `Code.gs` and `Index.html`, run `createClusterGhBookingSystem` once as the intended owner, approve the requested permissions, and use the URLs returned in the execution log. Do not rerun this bootstrap in the already connected project.

## Add the logo and Form styling

The latest supplied image is included as `ClusterGh_Logo.png`.

- In Google Forms, open the created form, choose **Customize theme → Header → Choose image → Upload**, and select `ClusterGh_Logo.png`. Review the crop so the complete logo is visible. Google Apps Script's Forms service does not expose a header-image upload operation.
- The logo has been uploaded to the signed-in Drive account as `ClusterGh_Logo.png` (file ID: `1pCIqNgACOAB0L0L4kWRgF-tfDjqEGS0P`). This ID is the default in `Code.gs`; the optional `CLUSTERGH_LOGO_FILE_ID` Script Property overrides it if you replace the image. Keep the Drive file private; Apps Script embeds it in the page.

## Configure the schedule and staff workflow

In the spreadsheet's **Admin Setup** tab, authorized staff should configure:

| Setting | Example | Meaning |
|---|---|---|
| Working days | `MON,TUE,WED,THU,FRI,SAT` | Days on which sessions may be approved |
| Opening time | `09:00` | Local studio opening time, 24-hour clock |
| Closing time | `18:00` | Local studio closing time, 24-hour clock |
| Break times | `12:00-13:00,15:30-15:45` | Optional comma-separated break ranges |
| Blocked dates | `2026-12-25,2026-12-26` | Optional holidays or other unavailable dates |
| Session duration minutes | `120` | Appointment length |
| Buffer minutes | `30` | Protected time before and after an appointment |

Work days and hours are intentionally blank initially. Until staff configure them, availability is marked **staff review required**; it is not presented as available.

The workflow for each request is:

1. The Form (or optional website) records the answers and creates a unique reference. Duplicate matching phone/service/date/time requests are flagged for staff review.
2. The automation checks the calendar and configured schedule, records the result, and attempts request notifications. The initial status is **Pending** and no event is added.
3. Authorized staff can change a booking's status in the private spreadsheet. Setting **Confirmed** or **Scheduled** performs a fresh schedule and conflict check; only then is a calendar event created. If the check fails, the previous status is restored and the reason is recorded.
4. **Cancelled**, **Rescheduled**, and **Pending** remove an existing calendar event. To reschedule, set the booking to **Rescheduled**, update the requested date/time, then confirm or schedule again.
5. Every status change is written to **Booking History** with previous/new status, timestamp and administrator action. A status notification is sent automatically to the client and both business WhatsApp numbers if the approved Meta template is configured.
6. Package price and payment fields remain protected and are not editable through the disabled dashboard or directly in the sheet. Do not enter or mark payments as received without a verified payment-recording workflow.

Keep the response spreadsheet and calendar restricted to staff who need access. Do not publish them or expose customer rows through the public Form.

## WhatsApp Cloud API connection

WhatsApp delivery is not active until the business connects an approved Meta WhatsApp Business Platform / Cloud API sender. The WhatsApp Business app alone is not sufficient. The sender's number must be registered with the Cloud API, and recipients must be eligible to receive the messages.

Follow Meta's [WhatsApp Cloud API getting started guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started#step-2-start-using-the-api) to register a WhatsApp Business sender and obtain the required credentials. In the Apps Script project's **Project Settings → Script properties**, add:

- `WHATSAPP_TOKEN` — server-side Meta access token with required WhatsApp permissions
- `WHATSAPP_PHONE_NUMBER_ID` — Meta Cloud API Phone Number ID (not the displayed phone number)
- `WHATSAPP_TEMPLATE_LANGUAGE` — approved template language, commonly `en`
- `WHATSAPP_REQUEST_TEMPLATE_NAME` — approved utility template for business booking alerts; **11 body variables**, in order: reference, client name, client phone, service, outfit count, requested date/time, event/birthday date, location, preferred contact method, notes, availability result
- `WHATSAPP_ACK_TEMPLATE_NAME` — approved client acknowledgement template; **2 body variables**: reference, client name. Its wording must say the request was received and is not confirmed.
- `WHATSAPP_STATUS_TEMPLATE_NAME` — approved status template; **4 body variables**: reference, client name, status, requested date/time

Submit the three templates for Meta approval before adding their exact names to Script Properties. WhatsApp may require an approved template for business-initiated messages outside its customer-service window. The automation never falls back to an unapproved free-form message. Each request and status notification to the client and both business numbers is sent in parallel, with separate per-recipient results and failures appended to **Notification failure log**. A successful Cloud API response is recorded as **accepted by Meta; delivery not confirmed**, not as delivered. In the spreadsheet, **ClusterGh Bookings → Retry failed WhatsApp request notifications** retries request/status recipients not accepted by Meta; accepted messages are not resent.

Business notification destinations are configured as WhatsApp 1 (`+233 24 186 6720`) and WhatsApp 2 (`+233 55 935 6400`). The client receives a request acknowledgement and status updates through the Cloud API if configured. The API acceptance status is not proof of delivery. The current project has no Meta token, sender ID, or approved template names configured, so automatic sending remains inactive until the business adds them.

## Optional branded booking page

`Index.html` provides a responsive public booking page served by the same Apps Script project. It uses the same booking database, validation, reference generation, and WhatsApp request workflow. It does not expose calendar availability or reserve appointments. The logo is shown in a round crop at the top left. The deployment serves only the customer page; `?page=admin` no longer exposes an admin dashboard.

The website logo is configured to use the uploaded Drive image by default. The current web app is deployed as the system owner with **Anyone** access and serves the customer booking page only. Test the client page from a non-owner account. A public Apps Script endpoint runs under the owner's quotas and permissions; monitor submissions and protect spreadsheet/calendar access.

## Privacy and data handling

The Form asks only for booking/contact details, uses an explicit booking-request agreement, and shows a privacy notice. Use the information only to review and manage the booking and contact the client about it. Do not request sensitive personal information. Restrict access to the response spreadsheet and calendar, and follow the business's retention and deletion policy.

## Final steps that require account/provider access

- No additional Google bootstrap authorization is needed for the existing deployment. Google account authorization is needed only if updating the script requires new scopes or creating a fresh system.
- Upload the supplied logo in the Google Form theme. The website uses the already-uploaded Drive logo by default.
- Configure actual working days, hours, breaks, holidays/blocked dates, session duration and buffer in **Admin Setup**.
- Connect and approve the Meta Cloud API sender and message templates, then add the Script Properties. Until that is done, WhatsApp status will read **NOT CONFIGURED** and messages will not be sent. A successful API response means accepted by Meta, not confirmed delivered.
- Copy the real Form responder URL from the Apps Script execution log after successful creation; publish only after an end-to-end test.
