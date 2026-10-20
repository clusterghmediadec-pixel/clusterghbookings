const CONFIG = {
  BRAND: 'ClusterGh Photography',
  STUDIO: 'ClusterGh Studios',
  FORM_TITLE: 'ClusterGh Photography — Official Shoot Booking Form',
  SHEET_TITLE: 'ClusterGh Photography — Booking Management',
  CALENDAR_TITLE: 'ClusterGh Photography Bookings',
  TIMEZONE: 'Africa/Accra',
  PREFIX: 'CLG',
  LOGO_FILE_ID: '1pCIqNgACOAB0L0L4kWRgF-tfDjqEGS0P',
  STUDIO_ADDRESS: 'ClusterGh Studios, Dansoman Road, Aliu Mahama Street, Accra, Ghana',
  BUSINESS_EMAIL: 'Clusterghmediadec@gmail.com',
  LOCATION_CHOICES: ['ClusterGh Studios', 'Outdoor location', "Client's preferred location", 'Event venue'],
  BUSINESS_WHATSAPP: ['233241866720', '233559356400'],
  SERVICES: [
    'Studio Shoot', 'Outdoor Shoot', 'Birthday Shoot', 'Graduation Shoot',
    'Fashion Shoot', 'Portrait Session', 'Event Photography', 'Creative Shoot',
    'Corporate Photography', 'Other'
  ],
  STATUSES: [
    'Pending', 'Confirmed', 'Deposit Paid', 'Partially Paid', 'Fully Paid',
    'Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-show'
  ],
  PAYMENT_STATUSES: ['Unpaid', 'Deposit Paid', 'Partially Paid', 'Fully Paid', 'Partially Refunded', 'Refunded'],
  FIELD_LABELS: {
    name: 'Client’s full name',
    phone: 'WhatsApp phone number',
    email: 'Email address',
    service: 'Type of photography service',
    outfits: 'Number of outfits',
    date: 'Preferred booking date',
    time: 'Preferred time',
    location: 'Location preference',
    eventDate: 'Event or birthday date',
    venue: 'Preferred shoot location or venue details',
    notes: 'Additional notes or special requests',
    contact: 'Preferred contact method',
    agreement: 'Booking request agreement'
  },
  HEADERS: {
    reference: 'Booking reference',
    status: 'Booking status',
    payment: 'Payment status',
    availability: 'Availability-check result',
    eventId: 'Calendar event ID',
    waStatus: 'WhatsApp notification status',
    waBusiness1: 'WhatsApp business 1 request status',
    waBusiness2: 'WhatsApp business 2 request status',
    waClient: 'WhatsApp client request status',
    statusWa: 'Status-change notification status',
    statusBusiness1: 'WhatsApp business 1 status update',
    statusBusiness2: 'WhatsApp business 2 status update',
    statusClient: 'WhatsApp client status update',
    packagePrice: 'Package price (GHS)',
    depositDue: 'Deposit due (GHS)',
    amountPaid: 'Amount paid (GHS)',
    balance: 'Outstanding balance (GHS)',
    paymentReference: 'Payment reference',
    statusMessage: 'WhatsApp status message',
    statusLink: 'WhatsApp status chat link',
    statusDelivery: 'Status message delivery record',
    previousStatus: 'Previous booking status',
    lastStatusChange: 'Last status change',
    failures: 'Notification failure log',
    staff: 'Staff notes',
    webConsent: 'Web booking consent'
  },
  HISTORY_SHEET: 'Booking History',
  PAYMENT_HISTORY_SHEET: 'Payment History',
  TEMPLATES_SHEET: 'WhatsApp Templates',
  DEFAULT_SESSION_MINUTES: 120,
  DEFAULT_BUFFER_MINUTES: 30,
  FORM_DESCRIPTION: 'Welcome to ClusterGh Photography. Use this form to request your photography session. Our team will review your preferred date and time and contact you through WhatsApp to confirm availability and booking details. Submitting this form does not automatically confirm your appointment.',
  PRIVACY_NOTICE: 'We use the information you submit only to manage your photography booking request and contact you about it. A WhatsApp acknowledgement and booking updates may be sent to the number you provide. Please do not submit sensitive personal information.'
};

function createClusterGhBookingSystem() {
  const properties = PropertiesService.getScriptProperties();
  const existingFormId = properties.getProperty('CLUSTERGH_FORM_ID');
  const existingSheetId = properties.getProperty('CLUSTERGH_SHEET_ID');
  if (existingFormId && existingSheetId) {
    throw new Error('A ClusterGh system is already connected to this Apps Script project. Form: https://docs.google.com/forms/d/' + existingFormId + '/edit ; spreadsheet: https://docs.google.com/spreadsheets/d/' + existingSheetId + '/edit');
  }
  const ownerEmail = Session.getEffectiveUser().getEmail();
  if (!ownerEmail) throw new Error('Run setup using the Google account that will own and administer the booking system.');
  const activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!activeEmail || activeEmail !== ownerEmail.trim().toLowerCase()) {
    throw new Error('Run initial booking-system setup from the Apps Script editor while signed in as its owner.');
  }
  if (!properties.getProperty('CLUSTERGH_ADMIN_EMAILS')) properties.setProperty('CLUSTERGH_ADMIN_EMAILS', ownerEmail);

  const form = FormApp.create(CONFIG.FORM_TITLE);
  form.setDescription(CONFIG.FORM_DESCRIPTION);
  form.setConfirmationMessage('Thank you. Your booking request has been received; it does not reserve a date or time. ClusterGh Photography will review availability and contact you through your preferred contact method.');
  form.setCollectEmail(false);
  form.setAcceptingResponses(true);
  addBookingQuestions_(form);

  const ss = SpreadsheetApp.create(CONFIG.SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  properties.setProperty('CLUSTERGH_FORM_ID', form.getId());
  properties.setProperty('CLUSTERGH_SHEET_ID', ss.getId());
  const calendar = setupForSpreadsheet_(ss);

  const result = {
    formEditUrl: form.getEditUrl(),
    formResponseUrl: form.getPublishedUrl(),
    spreadsheetUrl: ss.getUrl(),
    calendarName: calendar.getName(),
    calendarId: calendar.getId()
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function addBookingQuestions_(form) {
  const f = CONFIG.FIELD_LABELS;
  form.addSectionHeaderItem().setTitle('About you');
  form.addTextItem().setTitle(f.name).setRequired(true);
  form.addTextItem().setTitle(f.phone).setHelpText('Ghana number, for example 0551234567 or +233551234567.').setRequired(true);
  form.addTextItem().setTitle(f.email).setHelpText('Optional. Used only to contact you about this request.').setValidation(
    FormApp.createTextValidation().requireTextIsEmail().build()
  ).setRequired(false);

  form.addSectionHeaderItem().setTitle('Your photography session');
  form.addListItem().setTitle(f.service).setChoiceValues(CONFIG.SERVICES).setRequired(true);
  form.addListItem().setTitle(f.outfits).setChoiceValues(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']).setRequired(true);
  form.addDateItem().setTitle(f.date).setIncludesYear(true).setRequired(true);
  form.addTimeItem().setTitle(f.time).setRequired(true);
  form.addMultipleChoiceItem().setTitle(f.location).setChoiceValues(CONFIG.LOCATION_CHOICES).setRequired(true);
  form.addDateItem().setTitle(f.eventDate).setIncludesYear(true).setRequired(false);
  form.addTextItem().setTitle(f.venue).setHelpText('Optional. Add an address, venue name, or location details.').setRequired(false);
  form.addParagraphTextItem().setTitle(f.notes).setHelpText('Optional. Do not include sensitive personal information.').setRequired(false);
  form.addMultipleChoiceItem().setTitle(f.contact).setChoiceValues(['WhatsApp', 'Email']).setRequired(true);
  form.addSectionHeaderItem().setTitle('Privacy & confirmation').setHelpText(CONFIG.PRIVACY_NOTICE);
  form.addCheckboxItem().setTitle(f.agreement).setChoiceValues([
    'I understand that my booking is a request and is not confirmed until ClusterGh Photography contacts me.'
  ]).setRequired(true);
}

function setupClusterGh() {
  assertAdmin_();
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty('CLUSTERGH_SHEET_ID');
  const ss = SpreadsheetApp.getActiveSpreadsheet() || (sheetId ? SpreadsheetApp.openById(sheetId) : null);
  if (!ss) throw new Error('Run createClusterGhBookingSystem() once to create the Form and spreadsheet, or open the booking spreadsheet before setup.');
  const calendar = setupForSpreadsheet_(ss);
  Logger.log('ClusterGh setup complete. Spreadsheet: ' + ss.getUrl() + '; calendar: ' + calendar.getName());
  return { spreadsheetUrl: ss.getUrl(), calendarName: calendar.getName(), calendarId: calendar.getId() };
}

function setupForSpreadsheet_(ss) {
  const properties = PropertiesService.getScriptProperties();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  properties.setProperty('CLUSTERGH_SHEET_ID', ss.getId());

  const sheet = findResponseSheet_(ss);
  Object.keys(CONFIG.HEADERS).forEach(key => ensureHeader_(sheet, CONFIG.HEADERS[key]));
  if (sheet.getLastColumn() > 0) applyColumnValidation_(sheet);

  const calendars = CalendarApp.getAllCalendars().filter(calendar => calendar.getName() === CONFIG.CALENDAR_TITLE);
  const calendar = calendars.length ? calendars[0] : CalendarApp.createCalendar(CONFIG.CALENDAR_TITLE, {
    timeZone: CONFIG.TIMEZONE,
    summary: 'ClusterGh Photography appointment calendar. Events are added only after staff confirmation.'
  });
  properties.setProperty('CLUSTERGH_CALENDAR_ID', calendar.getId());

  ScriptApp.getProjectTriggers()
    .filter(trigger => ['onClusterGhFormSubmit', 'onClusterGhStatusEdit'].indexOf(trigger.getHandlerFunction()) !== -1)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('onClusterGhFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('onClusterGhStatusEdit').forSpreadsheet(ss).onEdit().create();

  ensureAdminSheet_(ss, calendar);
  ensureManagementSheets_(ss);
  return calendar;
}

function findResponseSheet_(ss) {
  const expected = Object.keys(CONFIG.FIELD_LABELS).map(key => CONFIG.FIELD_LABELS[key]);
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const lastColumn = sheets[i].getLastColumn();
    if (!lastColumn) continue;
    const headers = sheets[i].getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    if (expected.some(header => headers.indexOf(header) !== -1)) return sheets[i];
  }
  const responseSheet = sheets.filter(sheet => /^Form Responses/i.test(sheet.getName()))[0];
  if (responseSheet) return responseSheet;
  return sheets.filter(sheet => sheet.getName() !== 'Admin Setup')[0];
}

function ensureAdminSheet_(ss, calendar) {
  let sheet = ss.getSheetByName('Admin Setup');
  if (!sheet) sheet = ss.insertSheet('Admin Setup');
  const initial = [
    ['Booking system settings', 'Value', 'Instructions'],
    ['Working days', '', 'Comma-separated: MON,TUE,WED,THU,FRI,SAT,SUN. Leave blank to require staff availability review.'],
    ['Opening time', '', '24-hour HH:mm, for example 09:00. Leave blank to require staff review.'],
    ['Closing time', '', '24-hour HH:mm, for example 18:00. Leave blank to require staff review.'],
    ['Break times', '', 'Optional comma-separated 24-hour ranges, for example 12:00-13:00,15:30-15:45.'],
    ['Blocked dates', '', 'Optional comma-separated dates in YYYY-MM-DD format.'],
    ['Session duration minutes', CONFIG.DEFAULT_SESSION_MINUTES, 'Appointment duration in minutes.'],
    ['Buffer minutes', CONFIG.DEFAULT_BUFFER_MINUTES, 'Buffer before and after each session.'],
    ['Payment status default', 'Unpaid', 'No prices or payments are set by this booking system.'],
    ['Studio address', CONFIG.STUDIO_ADDRESS, 'Default studio address.'],
    ['Business email', CONFIG.BUSINESS_EMAIL, 'Contact email for staff.'],
    ['Calendar', calendar.getName(), 'Calendar events are created only after staff changes a booking to Confirmed.'],
    ['WhatsApp configuration', 'Not connected', 'Configure WhatsApp Script Properties; use approved Meta templates.'],
    ['Logo file ID', CONFIG.LOGO_FILE_ID, 'Default private Drive logo used by the website. Override with CLUSTERGH_LOGO_FILE_ID in Script Properties if replacing the image.']
  ];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, initial.length, 3).setValues(initial);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 3);
  } else {
    sheet.getRange('A1:C1').setValues([initial[0]]);
  }
}

function applyColumnValidation_(sheet) {
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  const statusRange = sheet.getRange(2, headerCol_(sheet, CONFIG.HEADERS.status), maxRows, 1);
  statusRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.STATUSES, true).setAllowInvalid(false).build());
  const paymentRange = sheet.getRange(2, headerCol_(sheet, CONFIG.HEADERS.payment), maxRows, 1);
  paymentRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(
    CONFIG.PAYMENT_STATUSES, true
  ).setAllowInvalid(false).build());
}

function ensureManagementSheets_(ss) {
  let history = ss.getSheetByName(CONFIG.HISTORY_SHEET);
  if (!history) {
    history = ss.insertSheet(CONFIG.HISTORY_SHEET);
    history.appendRow(['Booking reference', 'Previous status', 'New status', 'Date/time', 'Administrator', 'Action']);
    history.setFrozenRows(1);
  }
  let payments = ss.getSheetByName(CONFIG.PAYMENT_HISTORY_SHEET);
  if (!payments) {
    payments = ss.insertSheet(CONFIG.PAYMENT_HISTORY_SHEET);
    payments.appendRow(['Booking reference', 'Date/time', 'Type', 'Amount (GHS)', 'Verified', 'Transaction/reference', 'Administrator']);
    payments.setFrozenRows(1);
  }
  let templates = ss.getSheetByName(CONFIG.TEMPLATES_SHEET);
  if (!templates) {
    templates = ss.insertSheet(CONFIG.TEMPLATES_SHEET);
    templates.getRange(1, 1, DEFAULT_MESSAGE_TEMPLATES_.length + 1, 2).setValues([
      ['Status', 'Message template']
    ].concat(DEFAULT_MESSAGE_TEMPLATES_));
    templates.setFrozenRows(1);
    templates.autoResizeColumns(1, 2);
  } else if (DEFAULT_MESSAGE_TEMPLATES_.some(row =>
    row[0] === String(templates.getRange(1, 1).getDisplayValue()).trim()
  )) {
    templates.insertRowBefore(1);
    templates.getRange(1, 1, 1, 2).setValues([['Status', 'Message template']]);
    templates.setFrozenRows(1);
  }
}

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.logoDataUrl = getLogoDataUrl_();
  return template.evaluate()
    .setTitle('Book a Session | ClusterGh Studios')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

const DEFAULT_MESSAGE_TEMPLATES_ = [
  ['Pending', 'Hello {{client}}, thank you for choosing ClusterGh Photography. We have received your booking request {{ref}}. Your request is currently pending confirmation. We will update you shortly.'],
  ['Confirmed', 'Hello {{client}}, great news! Your booking {{ref}} with ClusterGh Photography has been confirmed for {{date}} at {{time}}. Service: {{service}}. Please contact us if you need any assistance.'],
  ['Deposit Paid', 'Hello {{client}}, we have recorded your deposit payment for booking {{ref}}. Your booking balance is {{balance}}. Thank you for choosing ClusterGh Photography.'],
  ['Partially Paid', 'Hello {{client}}, your partial payment for booking {{ref}} has been recorded. Amount paid: {{paid}}. Outstanding balance: {{balance}}. Thank you.'],
  ['Fully Paid', 'Hello {{client}}, your payment for booking {{ref}} is now fully settled. Thank you for choosing ClusterGh Photography. We look forward to serving you.'],
  ['Scheduled', 'Hello {{client}}, this is a reminder that your photography session {{ref}} is scheduled for {{date}} at {{time}}. Location: {{location}}. We look forward to seeing you.'],
  ['Completed', 'Hello {{client}}, thank you for booking with ClusterGh Photography. Your session under booking {{ref}} has been marked as completed. We appreciate your support.'],
  ['Cancelled', 'Hello {{client}}, your booking {{ref}} has been marked as cancelled. If you have any questions about payments, refunds, or rescheduling, please contact ClusterGh Photography.'],
  ['Rescheduled', 'Hello {{client}}, your booking {{ref}} has been rescheduled. Your updated session date is {{date}} at {{time}}. Please contact us if you need any clarification.'],
  ['No-show', 'Hello {{client}}, we noticed that you were unable to attend your scheduled photography session {{ref}}. Please contact ClusterGh Photography if you would like to discuss another available date.']
];

function getLogoDataUrl_() {
  const fileId = PropertiesService.getScriptProperties().getProperty('CLUSTERGH_LOGO_FILE_ID') || CONFIG.LOGO_FILE_ID;
  if (!fileId) {
    throw new Error('The ClusterGh logo is not configured. Upload ClusterGh_Logo.png to Google Drive and set CLUSTERGH_LOGO_FILE_ID in Script Properties.');
  }
  const file = DriveApp.getFileById(fileId);
  const mimeType = file.getMimeType();
  if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
    throw new Error('The configured ClusterGh logo must be a PNG or JPEG image.');
  }
  return 'data:' + mimeType + ';base64,' + Utilities.base64Encode(file.getBlob().getBytes());
}

function assertAdmin_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const allowed = String(PropertiesService.getScriptProperties().getProperty('CLUSTERGH_ADMIN_EMAILS') || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!email || allowed.indexOf(email) === -1) {
    throw new Error('Admin dashboard access denied. Sign in with an authorized Google account and add it to CLUSTERGH_ADMIN_EMAILS in Script Properties.');
  }
  return email;
}

function getDashboardData() {
  assertAdmin_();
  const ss = getBookingSpreadsheet_();
  const sheet = findResponseSheet_(ss);
  const lastRow = sheet.getLastRow();
  const bookings = [];
  for (let row = 2; row <= lastRow; row++) {
    const values = rowToObject_(sheet, row);
    const ref = String(values[CONFIG.HEADERS.reference] || '').trim();
    if (!ref) continue;
    const data = parseBooking_(values);
    const packagePrice = Number(values[CONFIG.HEADERS.packagePrice]) || 0;
    const depositDue = Number(values[CONFIG.HEADERS.depositDue]) || 0;
    const amountPaid = Number(values[CONFIG.HEADERS.amountPaid]) || 0;
    bookings.push({
      reference: ref,
      name: data.name,
      phone: data.phone,
      email: data.email,
      service: data.service,
      outfits: data.outfits,
      date: safeFormatDate_(data.date),
      time: normalizeTime_(data.time),
      eventDate: safeFormatDate_(data.eventDate),
      location: data.location,
      venue: data.venue,
      notes: data.notes,
      status: String(values[CONFIG.HEADERS.status] || 'Pending'),
      paymentStatus: String(values[CONFIG.HEADERS.payment] || 'Unpaid'),
      packagePrice: packagePrice,
      depositDue: depositDue,
      amountPaid: amountPaid,
      balance: Math.max(packagePrice - amountPaid, 0),
      availability: String(values[CONFIG.HEADERS.availability] || ''),
      staffNotes: String(values[CONFIG.HEADERS.staff] || ''),
      requestWhatsAppStatus: String(values[CONFIG.HEADERS.waStatus] || ''),
      statusMessage: String(values[CONFIG.HEADERS.statusMessage] || ''),
      statusLink: String(values[CONFIG.HEADERS.statusLink] || ''),
      statusDelivery: String(values[CONFIG.HEADERS.statusDelivery] || ''),
      history: getBookingHistory_(ss, ref)
    });
  }
  return {
    bookings: bookings,
    statuses: CONFIG.STATUSES,
    paymentStatuses: CONFIG.PAYMENT_STATUSES,
    templates: getMessageTemplates_(ss),
    adminEmail: assertAdmin_()
  };
}

function setBookingStatus(reference, status) {
  const admin = assertAdmin_();
  if (CONFIG.STATUSES.indexOf(status) === -1) throw new Error('Choose a valid booking status.');
  if (['Deposit Paid', 'Partially Paid', 'Fully Paid'].indexOf(status) !== -1) {
    throw new Error('Payment statuses can only be set after recording and verifying a payment.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = findResponseSheet_(getBookingSpreadsheet_());
    const row = findBookingRow_(sheet, reference);
    const statusCell = sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status));
    const previous = String(statusCell.getValue() || 'Pending');
    if (previous === status) {
      return { changed: false, status: previous, message: 'This booking already has that status.' };
    }
    statusCell.setValue(status);
    handleStatusChange_(sheet, row, status, previous);
    const current = String(statusCell.getValue() || previous);
    return {
      changed: current === status,
      status: current,
      message: String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.availability)).getDisplayValue()),
      whatsappUrl: String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusLink)).getValue() || '')
    };
  } finally {
    lock.releaseLock();
  }
}

function saveBookingPrice(reference, packagePrice, depositDue) {
  assertAdmin_();
  const price = Number(packagePrice);
  const deposit = Number(depositDue);
  if (!isFinite(price) || price < 0 || !isFinite(deposit) || deposit < 0 || deposit > price) {
    throw new Error('Enter a valid package price and a deposit amount that does not exceed it.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = findResponseSheet_(getBookingSpreadsheet_());
    const row = findBookingRow_(sheet, reference);
    const paid = Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.amountPaid)).getValue()) || 0;
    if (price < paid) throw new Error('The package price cannot be lower than verified payments already recorded. Record a verified refund first.');
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.packagePrice)).setValue(price);
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.depositDue)).setValue(deposit);
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.balance)).setValue(Math.max(price - paid, 0));
    logStatusHistory_(reference, '', '', 'Package price and deposit set by ' + currentActor_());
    return { packagePrice: price, depositDue: deposit, balance: Math.max(price - paid, 0) };
  } finally {
    lock.releaseLock();
  }
}

function recordBookingPayment(reference, amount, type, paymentReference, verified) {
  const admin = assertAdmin_();
  const value = Number(amount);
  const kind = String(type || '');
  const transaction = String(paymentReference || '').trim();
  if (!isFinite(value) || value <= 0) throw new Error('Enter a payment amount greater than zero.');
  if (['Payment', 'Refund'].indexOf(kind) === -1) throw new Error('Choose Payment or Refund.');
  if (!transaction || transaction.length > 120) throw new Error('Enter the verified receipt, transfer, or transaction reference.');
  if (verified !== true) throw new Error('Confirm that the payment or refund has actually been verified.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getBookingSpreadsheet_();
    const sheet = findResponseSheet_(ss);
    const row = findBookingRow_(sheet, reference);
    const price = Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.packagePrice)).getValue()) || 0;
    const deposit = Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.depositDue)).getValue()) || 0;
    const currentPaid = Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.amountPaid)).getValue()) || 0;
    if (!price) throw new Error('Enter and save the approved package price before recording a payment.');
    if (kind === 'Payment' && value > price - currentPaid) throw new Error('This payment exceeds the outstanding balance. Verify the amount due first.');
    if (kind === 'Refund' && value > currentPaid) throw new Error('The refund cannot exceed the amount recorded as paid.');
    const paymentHistory = ss.getSheetByName(CONFIG.PAYMENT_HISTORY_SHEET);
    if (paymentHistory.getLastRow() > 1) {
      const history = paymentHistory.getRange(2, 1, paymentHistory.getLastRow() - 1, 6).getDisplayValues();
      if (history.some(entry => entry[0] === reference && entry[5] === transaction)) {
        throw new Error('That payment reference is already recorded for this booking.');
      }
    }

    const newPaid = kind === 'Payment' ? currentPaid + value : currentPaid - value;
    const paymentStatus = kind === 'Refund'
      ? (newPaid ? 'Partially Refunded' : 'Refunded')
      : (newPaid >= price ? 'Fully Paid' : (deposit > 0 && newPaid >= deposit ? 'Deposit Paid' : 'Partially Paid'));
    const rowValues = rowToObject_(sheet, row);
    const previous = String(rowValues[CONFIG.HEADERS.status] || 'Pending');

    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.amountPaid)).setValue(newPaid);
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.balance)).setValue(Math.max(price - newPaid, 0));
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.payment)).setValue(paymentStatus);
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.paymentReference)).setValue(transaction);
    if (kind === 'Payment') {
      sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status)).setValue(paymentStatus);
      handleStatusChange_(sheet, row, paymentStatus, previous);
    }
    paymentHistory.appendRow([reference, new Date(), kind, value, 'Verified by ' + admin, transaction, admin]);
    return { amountPaid: newPaid, balance: Math.max(price - newPaid, 0), paymentStatus: paymentStatus };
  } finally {
    lock.releaseLock();
  }
}

function saveBookingSchedule(reference, date, time) {
  assertAdmin_();
  const bookingDate = parseDate_(String(date || ''), true);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) throw new Error('Enter a valid 24-hour session time.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = findResponseSheet_(getBookingSpreadsheet_());
    const row = findBookingRow_(sheet, reference);
    const values = rowToObject_(sheet, row);
    const data = parseBooking_(values);
    const previous = String(values[CONFIG.HEADERS.status] || 'Pending');
    sheet.getRange(row, headerCol_(sheet, CONFIG.FIELD_LABELS.date)).setValue(bookingDate);
    sheet.getRange(row, headerCol_(sheet, CONFIG.FIELD_LABELS.time)).setValue(time);
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status)).setValue('Rescheduled');
    handleStatusChange_(sheet, row, 'Rescheduled', previous);
    data.date = bookingDate;
    data.time = time;
    const calendarId = PropertiesService.getScriptProperties().getProperty('CLUSTERGH_CALENDAR_ID');
    const calendar = calendarId ? CalendarApp.getCalendarById(calendarId) : null;
    const check = calendar ? checkAvailability_(calendar, data) : { message: 'Calendar is not configured; staff review required.' };
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.availability)).setValue(check.message);
    return { status: 'Rescheduled', availability: check.message, whatsappUrl: sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusLink)).getValue() };
  } finally {
    lock.releaseLock();
  }
}

function saveStaffNotes(reference, notes) {
  const admin = assertAdmin_();
  const text = String(notes || '').trim();
  if (text.length > 2000) throw new Error('Staff notes must be 2,000 characters or fewer.');
  const sheet = findResponseSheet_(getBookingSpreadsheet_());
  const row = findBookingRow_(sheet, reference);
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.staff)).setValue(text);
  logStatusHistory_(reference, '', '', 'Staff note updated by ' + admin);
  return true;
}

function saveWhatsAppTemplates(templates) {
  assertAdmin_();
  if (!templates || typeof templates !== 'object') throw new Error('No message templates were supplied.');
  const sheet = getBookingSpreadsheet_().getSheetByName(CONFIG.TEMPLATES_SHEET);
  const rows = sheet.getDataRange().getDisplayValues();
  const valid = CONFIG.STATUSES;
  for (let i = 1; i < rows.length; i++) {
    const status = rows[i][0];
    const text = String(templates[status] || '').trim();
    if (valid.indexOf(status) === -1 || !text || text.length > 1500) {
      throw new Error('Each status message must be non-empty and no longer than 1,500 characters.');
    }
    sheet.getRange(i + 1, 2).setValue(text);
  }
  return getMessageTemplates_(getBookingSpreadsheet_());
}

function recordStatusMessageOutcome(reference, sent) {
  const admin = assertAdmin_();
  const sheet = findResponseSheet_(getBookingSpreadsheet_());
  const row = findBookingRow_(sheet, reference);
  const outcome = sent === true
    ? 'Admin marked sent; click-to-chat delivery is not independently verified.'
    : 'Admin marked not sent.';
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusDelivery)).setValue(outcome);
  logStatusHistory_(reference, '', '', 'WhatsApp status message: ' + outcome + ' (' + admin + ')');
  return outcome;
}

function findBookingRow_(sheet, reference) {
  const ref = String(reference || '').trim();
  if (!ref) throw new Error('Booking reference is required.');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No bookings are available.');
  const values = sheet.getRange(2, headerCol_(sheet, CONFIG.HEADERS.reference), lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (values[i][0] === ref) return i + 2;
  throw new Error('Booking reference not found.');
}

function getBookingHistory_(ss, reference) {
  const sheet = ss.getSheetByName(CONFIG.HISTORY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues()
    .filter(row => row[0] === reference)
    .map(row => ({ previous: row[1], next: row[2], date: row[3], actor: row[4], action: row[5] }));
}

function logStatusHistory_(reference, previous, next, action, actor) {
  const history = getBookingSpreadsheet_().getSheetByName(CONFIG.HISTORY_SHEET);
  history.appendRow([reference, previous, next, new Date(), actor || currentActor_(), action]);
}

function currentActor_() {
  return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Authorized user';
}

function getMessageTemplates_(ss) {
  const sheet = ss.getSheetByName(CONFIG.TEMPLATES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const result = {};
  const firstCell = String(sheet.getRange(1, 1).getDisplayValue()).trim();
  const firstTemplateIsData = DEFAULT_MESSAGE_TEMPLATES_.some(row => row[0] === firstCell);
  const firstDataRow = firstCell === 'Status' ? 2 : (firstTemplateIsData ? 1 : 2);
  sheet.getRange(firstDataRow, 1, sheet.getLastRow() - firstDataRow + 1, 2).getDisplayValues()
    .forEach(row => { if (row[0]) result[row[0]] = row[1]; });
  return result;
}

function renderStatusMessage_(sheet, row, data, reference, status) {
  const templates = getMessageTemplates_(getBookingSpreadsheet_());
  const tokens = {
    client: data.name || 'Client',
    ref: reference,
    date: safeFormatDate_(data.date),
    time: normalizeTime_(data.time),
    service: data.service || 'Photography session',
    paid: formatMoney_(Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.amountPaid)).getValue()) || 0),
    price: formatMoney_(Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.packagePrice)).getValue()) || 0),
    deposit: formatMoney_(Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.depositDue)).getValue()) || 0),
    balance: formatMoney_(Number(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.balance)).getValue()) || 0),
    eventdate: data.eventDate ? safeFormatDate_(data.eventDate) : 'Not provided',
    location: bookingLocation_(data) || CONFIG.STUDIO_ADDRESS
  };
  return String(templates[status] || 'Hello {{client}}, your booking {{ref}} status is {{status}}.')
    .replace(/\{\{([a-z]+)\}\}/gi, (match, name) => Object.prototype.hasOwnProperty.call(tokens, name.toLowerCase()) ? tokens[name.toLowerCase()] : match)
    .replace('{{status}}', status);
}

function formatMoney_(value) {
  return 'GH₵ ' + Number(value || 0).toFixed(2);
}

function safeFormatDate_(value) {
  if (!value) return '';
  try { return formatDate_(value); } catch (error) { return String(value); }
}

function submitBooking(formData) {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) throw new Error('Please complete the booking form and try again.');
  if (String(formData.website || '').trim()) throw new Error('Unable to submit this request.');

  const data = {
    name: cleanText_(formData.name, 100),
    phone: cleanText_(formData.phone, 30),
    email: cleanText_(formData.email, 254),
    service: cleanText_(formData.service, 50),
    outfits: cleanText_(formData.outfits, 2),
    date: cleanText_(formData.date, 10),
    time: cleanText_(formData.time, 5),
    location: cleanText_(formData.location, 50),
    eventDate: cleanText_(formData.eventDate, 10),
    venue: cleanText_(formData.venue, 250),
    notes: cleanText_(formData.notes, 1000),
    contact: cleanText_(formData.contact, 20),
    agreement: formData.agreement === true || ['true', 'on'].indexOf(String(formData.agreement || '')) !== -1,
    consent: formData.consent === true || ['true', 'on'].indexOf(String(formData.consent || '')) !== -1
  };
  validateBooking_(data, true);

  const settings = PropertiesService.getScriptProperties();
  const sheetId = settings.getProperty('CLUSTERGH_SHEET_ID');
  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : null;
  if (!ss) throw new Error('Booking setup is incomplete. Run createClusterGhBookingSystem() from Apps Script first.');
  const sheet = findResponseSheet_(ss);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = sheet.getLastRow() + 1;
    const values = {};
    values.Timestamp = new Date();
    values[CONFIG.FIELD_LABELS.name] = data.name;
    values[CONFIG.FIELD_LABELS.phone] = data.phone;
    values[CONFIG.FIELD_LABELS.email] = data.email;
    values[CONFIG.FIELD_LABELS.service] = data.service;
    values[CONFIG.FIELD_LABELS.outfits] = data.outfits;
    values[CONFIG.FIELD_LABELS.date] = Utilities.parseDate(data.date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    values[CONFIG.FIELD_LABELS.time] = data.time;
    values[CONFIG.FIELD_LABELS.location] = data.location;
    values[CONFIG.FIELD_LABELS.eventDate] = data.eventDate ? Utilities.parseDate(data.eventDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
    values[CONFIG.FIELD_LABELS.venue] = data.venue;
    values[CONFIG.FIELD_LABELS.notes] = data.notes;
    values[CONFIG.FIELD_LABELS.contact] = data.contact;
    values[CONFIG.FIELD_LABELS.agreement] = data.agreement ? 'Agreed' : '';
    values[CONFIG.HEADERS.webConsent] = data.consent ? 'Agreed' : '';
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    sheet.getRange(row, 1, 1, headers.length).setValues([
      headers.map(header => Object.prototype.hasOwnProperty.call(values, header) ? values[header] : '')
    ]);
    processNewBooking_(sheet, row);
    return {
      reference: String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.reference)).getDisplayValue()),
      status: String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status)).getDisplayValue()),
      availability: String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.availability)).getDisplayValue()),
      packagePrice: (function () {
        const value = sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.packagePrice)).getValue();
        return value === '' || value === null ? '' : Number(value);
      })()
    };
  } finally {
    lock.releaseLock();
  }
}

function validateBooking_(data, isWeb) {
  if (!data.name) throw new Error('Enter your full name.');
  if (!normalizeGhanaPhone_(data.phone)) throw new Error('Enter a valid Ghana WhatsApp number, such as 0551234567 or +233551234567.');
  if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) throw new Error('Enter a valid email address, or leave it blank.');
  if (CONFIG.SERVICES.indexOf(data.service) === -1) throw new Error('Choose one of the listed photography services.');
  if (!/^(?:[1-9]|10)$/.test(data.outfits)) throw new Error('Choose between 1 and 10 outfits.');
  parseDate_(data.date, true);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizeTime_(data.time))) throw new Error('Enter a valid 24-hour time.');
  const legacyPreferredLocation = data.location === 'Client’s preferred location';
  if (CONFIG.LOCATION_CHOICES.indexOf(data.location) === -1 && !legacyPreferredLocation) throw new Error('Choose a valid location preference.');
  if (data.eventDate) parseDate_(data.eventDate, false);
  if (data.venue.length > 250 || data.notes.length > 1000) throw new Error('Please shorten the location details or notes.');
  if (['WhatsApp', 'Email'].indexOf(data.contact) === -1) throw new Error('Choose WhatsApp or email as your preferred contact method.');
  if (data.contact === 'Email' && !data.email) throw new Error('Add an email address to choose email as your preferred contact method.');
  if (!data.agreement) throw new Error('Please confirm that you understand this is a booking request, not a confirmed appointment.');
  if (isWeb && !data.consent) throw new Error('Please accept the privacy acknowledgement.');
}

function parseDate_(value, required) {
  if (!value && !required) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const text = String(value || '').trim();
  if (!text) throw new Error('A booking date is required.');
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = Utilities.parseDate(text, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd') !== text) throw new Error('Enter a valid date.');
    return date;
  }
  const date = new Date(text);
  if (isNaN(date.getTime())) throw new Error('Enter a valid date.');
  return date;
}

function cleanText_(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length > maxLength) throw new Error('One or more answers are longer than allowed.');
  return text;
}

function onClusterGhFormSubmit(e) {
  if (!e || !e.range) throw new Error('This handler must be run by the spreadsheet form-submit trigger.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    processNewBooking_(e.range.getSheet(), e.range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function processNewBooking_(sheet, row) {
  Object.keys(CONFIG.HEADERS).forEach(key => ensureHeader_(sheet, CONFIG.HEADERS[key]));
  applyColumnValidation_(sheet);
  const values = rowToObject_(sheet, row);
  const data = parseBooking_(values);
  const headers = CONFIG.HEADERS;
  const refCell = sheet.getRange(row, headerCol_(sheet, headers.reference));
  const statusCell = sheet.getRange(row, headerCol_(sheet, headers.status));
  const availabilityCell = sheet.getRange(row, headerCol_(sheet, headers.availability));
  const ref = createBookingRef_(sheet);
  refCell.setValue(ref);
  statusCell.setValue('Pending');
  sheet.getRange(row, headerCol_(sheet, headers.payment)).setValue('Unpaid');

  try {
    validateBooking_(data, false);
  } catch (error) {
    availabilityCell.setValue('Needs staff review: ' + error.message);
    sheet.getRange(row, headerCol_(sheet, headers.waStatus)).setValue('Not sent - invalid or incomplete booking details');
    return;
  }
  logStatusHistory_(ref, '', 'Pending', 'New booking request received');

  const duplicateRef = findDuplicateBooking_(sheet, row, data);
  const calendarId = PropertiesService.getScriptProperties().getProperty('CLUSTERGH_CALENDAR_ID');
  const calendar = calendarId ? CalendarApp.getCalendarById(calendarId) : null;
  if (!calendar) {
    availabilityCell.setValue('Needs staff review: booking calendar is not configured.');
  } else {
    const check = checkAvailability_(calendar, data);
    availabilityCell.setValue(duplicateRef
      ? 'Potential duplicate of ' + duplicateRef + ' - staff review required'
      : check.message);
  }

  notifyNewRequest_(sheet, row, data, ref, availabilityCell.getDisplayValue());
}

function parseBooking_(obj) {
  const f = CONFIG.FIELD_LABELS;
  const agreement = obj[f.agreement];
  return {
    name: String(obj[f.name] || '').trim(),
    phone: String(obj[f.phone] || '').trim(),
    email: String(obj[f.email] || '').trim(),
    service: String(obj[f.service] || '').trim(),
    outfits: String(obj[f.outfits] || '').trim(),
    date: obj[f.date],
    time: obj[f.time],
    location: String(obj[f.location] || '').trim(),
    eventDate: obj[f.eventDate] || '',
    venue: String(obj[f.venue] || '').trim(),
    notes: String(obj[f.notes] || '').trim(),
    contact: String(obj[f.contact] || '').trim(),
    agreement: Array.isArray(agreement) ? agreement.length > 0 : Boolean(agreement),
    consent: String(obj[CONFIG.HEADERS.webConsent] || '') === 'Agreed'
  };
}

function findDuplicateBooking_(sheet, currentRow, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return '';
  const phoneCol = headerCol_(sheet, CONFIG.FIELD_LABELS.phone);
  const dateCol = headerCol_(sheet, CONFIG.FIELD_LABELS.date);
  const timeCol = headerCol_(sheet, CONFIG.FIELD_LABELS.time);
  const serviceCol = headerCol_(sheet, CONFIG.FIELD_LABELS.service);
  const refCol = headerCol_(sheet, CONFIG.HEADERS.reference);
  const phones = sheet.getRange(2, phoneCol, lastRow - 1, 1).getDisplayValues();
  const dates = sheet.getRange(2, dateCol, lastRow - 1, 1).getValues();
  const times = sheet.getRange(2, timeCol, lastRow - 1, 1).getDisplayValues();
  const services = sheet.getRange(2, serviceCol, lastRow - 1, 1).getDisplayValues();
  const refs = sheet.getRange(2, refCol, lastRow - 1, 1).getDisplayValues();
  const targetDate = formatDate_(data.date);
  const targetTime = normalizeTime_(data.time);
  for (let i = 0; i < lastRow - 1; i++) {
    if (i + 2 === currentRow) continue;
    if (!refs[i][0] || !dates[i][0]) continue;
    let previousDate;
    try {
      previousDate = formatDate_(dates[i][0]);
    } catch (error) {
      continue;
    }
    if (normalizeGhanaPhone_(phones[i][0]) === normalizeGhanaPhone_(data.phone) &&
      previousDate === targetDate &&
      normalizeTime_(times[i][0]) === targetTime &&
      services[i][0] === data.service) return refs[i][0] || 'another request';
  }
  return '';
}

function checkAvailability_(calendar, data, ignoreEventId) {
  const start = combineDateTime_(data.date, data.time);
  const duration = getSettingNumber_('Session duration minutes', CONFIG.DEFAULT_SESSION_MINUTES);
  if (!isFinite(duration) || duration <= 0 || duration % 1 !== 0) return { available: false, message: 'Session duration is invalid. Staff review required.' };
  const end = new Date(start.getTime() + duration * 60000);
  if (start.getTime() < Date.now()) return { available: false, message: 'Unavailable: requested date/time is in the past.' };

  const buffer = getSettingNumber_('Buffer minutes', CONFIG.DEFAULT_BUFFER_MINUTES);
  if (!isFinite(buffer) || buffer % 1 !== 0) return { available: false, message: 'Buffer minutes are invalid. Staff review required.' };
  const conflicts = calendar.getEvents(new Date(start.getTime() - buffer * 60000), new Date(end.getTime() + buffer * 60000))
    .filter(event => !ignoreEventId || event.getId() !== ignoreEventId);
  if (conflicts.length) return { available: false, message: 'Unavailable: conflicts with an existing calendar event.' };

  const dateKey = formatDate_(start);
  const blockedDates = getSetting_('Blocked dates').split(',').map(value => value.trim()).filter(Boolean);
  if (blockedDates.some(value => !/^\d{4}-\d{2}-\d{2}$/.test(value) || formatDate_(value) !== value)) {
    return { available: false, message: 'Blocked dates contain an invalid date. Staff review required.' };
  }
  if (blockedDates.indexOf(dateKey) !== -1) return { available: false, message: 'Unavailable: date is marked as blocked.' };

  const days = getSetting_('Working days').split(',').map(value => value.trim().toUpperCase()).filter(Boolean);
  const opening = getSetting_('Opening time');
  const closing = getSetting_('Closing time');
  if (!days.length || !opening || !closing) {
    return { available: false, message: 'Calendar checked; working schedule is not configured. Staff review required.' };
  }
  const weekday = Utilities.formatDate(start, CONFIG.TIMEZONE, 'EEE').toUpperCase();
  if (days.indexOf(weekday) === -1) return { available: false, message: 'Unavailable: outside configured working days.' };
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(opening) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(closing)) {
    return { available: false, message: 'Working hours are invalid. Staff review required.' };
  }
  const openMinute = timeToMinutes_(opening);
  const closeMinute = timeToMinutes_(closing);
  if (closeMinute <= openMinute) return { available: false, message: 'Working hours are invalid. Staff review required.' };
  const requestedMinute = timeToMinutes_(Utilities.formatDate(start, CONFIG.TIMEZONE, 'HH:mm'));
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (requestedMinute < openMinute || requestedMinute + durationMinutes > closeMinute) {
    return { available: false, message: 'Unavailable: outside configured working hours.' };
  }

  const breaks = getSetting_('Break times').split(',').map(value => value.trim()).filter(Boolean);
  for (let i = 0; i < breaks.length; i++) {
    const match = breaks[i].match(/^((?:[01]\d|2[0-3]):[0-5]\d)-((?:[01]\d|2[0-3]):[0-5]\d)$/);
    if (!match || timeToMinutes_(match[1]) >= timeToMinutes_(match[2])) {
      return { available: false, message: 'Break times are invalid. Staff review required.' };
    }
    const finishMinute = requestedMinute + durationMinutes;
    if (requestedMinute < timeToMinutes_(match[2]) && finishMinute > timeToMinutes_(match[1])) {
      return { available: false, message: 'Unavailable: requested time overlaps the configured break.' };
    }
  }
  return { available: true, message: 'Calendar and configured working hours checked; available for staff approval.' };
}

function onClusterGhStatusEdit(e) {
  if (!e || !e.range || e.range.getRow() < 2) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== findResponseSheet_(sheet.getParent()).getName()) return;
  if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  const column = e.range.getColumn();
  const protectedColumns = [
    CONFIG.HEADERS.payment, CONFIG.HEADERS.packagePrice, CONFIG.HEADERS.depositDue,
    CONFIG.HEADERS.amountPaid, CONFIG.HEADERS.balance, CONFIG.HEADERS.paymentReference
  ].map(header => headerCol_(sheet, header));
  if (protectedColumns.indexOf(column) !== -1) {
    if (e.oldValue === undefined) e.range.clearContent();
    else e.range.setValue(e.oldValue);
    sheet.toast('Financial fields are protected. No web dashboard is enabled for editing prices or payments.', 'Protected booking field', 8);
    logStatusHistory_(
      String(sheet.getRange(e.range.getRow(), headerCol_(sheet, CONFIG.HEADERS.reference)).getDisplayValue()),
      '', '', 'Blocked direct financial-field edit', e.user ? e.user.getEmail() : ''
    );
    return;
  }
  if (column !== headerCol_(sheet, CONFIG.HEADERS.status)) return;
  const status = String(e.value || '').trim();
  if (CONFIG.STATUSES.indexOf(status) === -1 || status === String(e.oldValue || '').trim()) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const previous = String(e.oldValue || 'Pending').trim();
    if (['Deposit Paid', 'Partially Paid', 'Fully Paid'].indexOf(status) !== -1) {
      e.range.setValue(previous);
      sheet.toast('Payment statuses require a verified payment record. No web dashboard is enabled for recording payments.', 'Payment verification required', 8);
      return;
    }
    handleStatusChange_(sheet, e.range.getRow(), status, previous, e.user ? e.user.getEmail() : '');
  } finally {
    lock.releaseLock();
  }
}

function handleStatusChange_(sheet, row, status, previousStatus, actor) {
  const headers = CONFIG.HEADERS;
  const data = parseBooking_(rowToObject_(sheet, row));
  const ref = String(sheet.getRange(row, headerCol_(sheet, headers.reference)).getDisplayValue());
  const eventCell = sheet.getRange(row, headerCol_(sheet, headers.eventId));
  const eventId = String(eventCell.getValue() || '');
  const calendarId = PropertiesService.getScriptProperties().getProperty('CLUSTERGH_CALENDAR_ID');
  const calendar = calendarId ? CalendarApp.getCalendarById(calendarId) : null;

  if (status === 'Confirmed' || status === 'Scheduled') {
    if (!calendar) {
      rejectConfirmation_(sheet, row, 'Booking calendar is not configured.', previousStatus);
      return;
    }
    const currentAvailability = String(sheet.getRange(row, headerCol_(sheet, headers.availability)).getDisplayValue());
    if (currentAvailability.indexOf('Potential duplicate of ') === 0) {
      rejectConfirmation_(sheet, row, 'Potential duplicate booking requires staff review.', previousStatus);
      return;
    }
    try {
      validateBooking_(data, false);
    } catch (error) {
      rejectConfirmation_(sheet, row, error.message, previousStatus);
      return;
    }
    let currentEvent = null;
    try {
      currentEvent = eventId ? calendar.getEventById(eventId) : null;
    } catch (error) {
      rejectConfirmation_(sheet, row, 'The existing calendar event could not be checked: ' + String(error), previousStatus);
      return;
    }
    const requestedStart = combineDateTime_(data.date, data.time);
    if (currentEvent && currentEvent.getStartTime().getTime() !== requestedStart.getTime()) {
      rejectConfirmation_(sheet, row, 'Set the booking to Rescheduled, update the requested date/time, then confirm again.', previousStatus);
      return;
    }
    if (eventId && !currentEvent) eventCell.clearContent();
    const check = checkAvailability_(calendar, data, currentEvent ? eventId : '');
    if (!check.available) {
      rejectConfirmation_(sheet, row, check.message, previousStatus);
      return;
    }
    if (!currentEvent) {
      const start = requestedStart;
      const duration = getSettingNumber_('Session duration minutes', CONFIG.DEFAULT_SESSION_MINUTES);
      const end = new Date(start.getTime() + duration * 60000);
      let event;
      try {
        event = calendar.createEvent(ref + ' — ' + data.service + ' — ' + data.name, start, end, {
          description: [
            'Booking reference: ' + ref,
            'Client: ' + data.name,
            'Phone: ' + data.phone,
            'Email: ' + (data.email || 'Not provided'),
            'Service: ' + data.service,
            'Outfits: ' + data.outfits,
            'Event/birthday date: ' + (data.eventDate ? formatDate_(data.eventDate) : 'Not provided'),
            'Location: ' + bookingLocation_(data),
            'Notes: ' + (data.notes || 'None'),
            'Status: ' + status + ' by authorized staff'
          ].join('\n'),
          location: bookingLocation_(data),
          guests: data.email && data.email.indexOf('@') > 0 ? data.email : undefined,
          sendInvites: Boolean(data.email && data.email.indexOf('@') > 0)
        });
      } catch (error) {
        rejectConfirmation_(sheet, row, 'Calendar event could not be created: ' + String(error), previousStatus);
        return;
      }
      event.setColor(CalendarApp.EventColor.BLACK);
      eventCell.setValue(event.getId());
    }
    sheet.getRange(row, headerCol_(sheet, headers.availability)).setValue(status + ' after staff approval; calendar event created.');
  }

  if (status === 'Cancelled' || status === 'Rescheduled' || status === 'Pending') {
    if (eventId && !calendar) {
      rejectConfirmation_(sheet, row, 'The existing calendar event could not be updated because the booking calendar is unavailable.', previousStatus);
      return;
    }
    if (eventId) {
      try {
        const event = calendar.getEventById(eventId);
        if (event) event.deleteEvent();
        eventCell.clearContent();
      } catch (error) {
        rejectConfirmation_(sheet, row, 'The existing calendar event could not be updated: ' + String(error), previousStatus);
        return;
      }
    }
    if (status === 'Rescheduled') {
      sheet.getRange(row, headerCol_(sheet, headers.availability)).setValue('Rescheduled; update date/time and confirm again to check and create a new event.');
    }
  }
  sheet.getRange(row, headerCol_(sheet, headers.previousStatus)).setValue(previousStatus || '');
  sheet.getRange(row, headerCol_(sheet, headers.lastStatusChange)).setValue(new Date());
  logStatusHistory_(ref, previousStatus || '', status, 'Booking status changed', actor);
  notifyStatusChange_(sheet, row, data, ref, status);
}

function rejectConfirmation_(sheet, row, reason, previousStatus) {
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status)).setValue(previousStatus || 'Pending');
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.availability)).setValue('Not confirmed: ' + reason);
  sheet.toast('Confirmation was not applied: ' + reason, 'ClusterGh booking', 8);
}

function notifyNewRequest_(sheet, row, data, ref, availability) {
  const destinations = [
    {
      column: CONFIG.HEADERS.waBusiness1,
      phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[0]),
      label: 'business 1',
      templateProperty: 'WHATSAPP_REQUEST_TEMPLATE_NAME'
    },
    {
      column: CONFIG.HEADERS.waBusiness2,
      phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[1]),
      label: 'business 2',
      templateProperty: 'WHATSAPP_REQUEST_TEMPLATE_NAME'
    },
    {
      column: CONFIG.HEADERS.waClient,
      phone: normalizeGhanaPhone_(data.phone),
      label: 'client',
      templateProperty: 'WHATSAPP_ACK_TEMPLATE_NAME'
    }
  ];
  const requestParams = [
    ref, data.name, data.phone, data.service, data.outfits, formatDateTime_(data.date, data.time),
    data.eventDate ? formatDate_(data.eventDate) : 'Not provided', bookingLocation_(data),
    data.contact, data.notes || 'None', availability
  ];
  destinations.forEach(destination => {
    destination.parameters = destination.label === 'client' ? [ref, data.name] : requestParams;
  });
  sendWhatsAppTemplatesInParallel_(destinations).forEach(outcome => {
    const destination = outcome.destination;
    sheet.getRange(row, headerCol_(sheet, destination.column)).setValue(outcome.result);
    recordNotificationResult_(sheet, row, destination.label + ' request notification', outcome.result);
  });
  const statuses = destinations.map(destination => String(sheet.getRange(row, headerCol_(sheet, destination.column)).getDisplayValue()));
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.waStatus)).setValue(statuses.every(isWhatsAppAccepted_)
    ? 'All recipients accepted by Meta for processing; delivery is not confirmed'
    : 'One or more recipients failed or are not configured; see per-recipient status and failure log.');
}

function notifyStatusChange_(sheet, row, data, ref, status) {
  const message = renderStatusMessage_(sheet, row, data, ref, status);
  const phone = normalizeGhanaPhone_(data.phone);
  const link = phone ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message) : '';
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusMessage)).setValue(message);
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusLink)).setValue(link);
  const parameters = [ref, data.name, status, formatDateTime_(data.date, data.time)];
  const destinations = [
    {
      column: CONFIG.HEADERS.statusClient,
      phone: phone,
      label: 'client status',
      templateProperty: 'WHATSAPP_STATUS_TEMPLATE_NAME'
    },
    {
      column: CONFIG.HEADERS.statusBusiness1,
      phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[0]),
      label: 'business 1 status',
      templateProperty: 'WHATSAPP_STATUS_TEMPLATE_NAME'
    },
    {
      column: CONFIG.HEADERS.statusBusiness2,
      phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[1]),
      label: 'business 2 status',
      templateProperty: 'WHATSAPP_STATUS_TEMPLATE_NAME'
    }
  ];
  destinations.forEach(destination => { destination.parameters = parameters; });
  const outcomes = sendWhatsAppTemplatesInParallel_(destinations);
  outcomes.forEach(outcome => {
    const destination = outcome.destination;
    sheet.getRange(row, headerCol_(sheet, destination.column)).setValue(outcome.result);
    recordNotificationResult_(sheet, row, destination.label, outcome.result);
  });
  const accepted = outcomes.every(outcome => isWhatsAppAccepted_(outcome.result));
  const summary = accepted
    ? 'Accepted by Meta for processing; recipient delivery is not confirmed'
    : 'One or more status notifications failed or are not configured; see per-recipient status and failure log';
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusDelivery)).setValue(summary);
  sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusWa)).setValue(summary);
}

function sendWhatsAppTemplatesInParallel_(destinations) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('WHATSAPP_TOKEN');
  const phoneNumberId = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  const language = props.getProperty('WHATSAPP_TEMPLATE_LANGUAGE') || 'en';
  const prepared = destinations.map(destination => {
    const templateName = props.getProperty(destination.templateProperty);
    if (!destination.phone) {
      return { destination: destination, result: 'FAILED: Invalid recipient phone number' };
    }
    if (!token || !phoneNumberId || !templateName) {
      return {
        destination: destination,
        result: 'NOT CONFIGURED: Add WhatsApp API credentials and approved ' + destination.templateProperty
      };
    }
    const url = 'https://graph.facebook.com/v22.0/' + encodeURIComponent(phoneNumberId) + '/messages';
    return {
      destination: destination,
      request: {
        url: url,
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify({
          messaging_product: 'whatsapp',
          to: destination.phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components: [{
              type: 'body',
              parameters: destination.parameters.map(value => ({
                type: 'text',
                text: String(value || 'Not provided').slice(0, 1024)
              }))
            }]
          }
        }),
        muteHttpExceptions: true
      }
    };
  });
  const pending = prepared.filter(entry => entry.request);
  if (pending.length) {
    try {
      const responses = UrlFetchApp.fetchAll(pending.map(entry => entry.request));
      responses.forEach((response, index) => {
        const code = response.getResponseCode();
        pending[index].result = code >= 200 && code < 300
          ? 'ACCEPTED BY META; delivery not confirmed'
          : 'FAILED: HTTP ' + code + ' ' + response.getContentText().slice(0, 300);
      });
    } catch (error) {
      pending.forEach(entry => {
        entry.result = 'FAILED: Parallel WhatsApp API request failed: ' + String(error).slice(0, 300);
      });
    }
  }
  return prepared.map(entry => ({
    destination: entry.destination,
    result: entry.result
  }));
}

function retryFailedNotifications() {
  assertAdmin_();
  const ss = getBookingSpreadsheet_();
  const sheet = findResponseSheet_(ss);
  const lastRow = sheet.getLastRow();
  let retried = 0;
  for (let row = 2; row <= lastRow; row++) {
    const data = parseBooking_(rowToObject_(sheet, row));
    const ref = String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.reference)).getDisplayValue());
    if (!ref) continue;
    try {
      validateBooking_(data, false);
    } catch (error) {
      continue;
    }
    const channels = [
      { column: CONFIG.HEADERS.waBusiness1, phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[0]), templateProperty: 'WHATSAPP_REQUEST_TEMPLATE_NAME', parameters: requestParamsForRow_(sheet, row, data, ref), label: 'business 1 request' },
      { column: CONFIG.HEADERS.waBusiness2, phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[1]), templateProperty: 'WHATSAPP_REQUEST_TEMPLATE_NAME', parameters: requestParamsForRow_(sheet, row, data, ref), label: 'business 2 request' },
      { column: CONFIG.HEADERS.waClient, phone: normalizeGhanaPhone_(data.phone), templateProperty: 'WHATSAPP_ACK_TEMPLATE_NAME', parameters: [ref, data.name], label: 'client request' }
    ];
    const pendingChannels = channels.filter(channel => {
      const cell = sheet.getRange(row, headerCol_(sheet, channel.column));
      return !isWhatsAppAccepted_(cell.getDisplayValue());
    });
    sendWhatsAppTemplatesInParallel_(pendingChannels).forEach(outcome => {
      const channel = outcome.destination;
      sheet.getRange(row, headerCol_(sheet, channel.column)).setValue(outcome.result);
      recordNotificationResult_(sheet, row, 'Retry ' + channel.label, outcome.result);
      retried++;
    });
    const requestStatuses = [
      CONFIG.HEADERS.waBusiness1,
      CONFIG.HEADERS.waBusiness2,
      CONFIG.HEADERS.waClient
    ].map(column => String(sheet.getRange(row, headerCol_(sheet, column)).getDisplayValue()));
    sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.waStatus)).setValue(
      requestStatuses.every(isWhatsAppAccepted_)
        ? 'All recipients accepted by Meta for processing; delivery is not confirmed'
        : 'One or more recipients failed or are not configured; see per-recipient status and failure log.'
    );
    const status = String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.status)).getDisplayValue());
    const statusDelivery = String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusDelivery)).getDisplayValue());
    if (CONFIG.STATUSES.indexOf(status) !== -1 && statusDelivery) {
      const statusChannels = [
        { column: CONFIG.HEADERS.statusClient, phone: normalizeGhanaPhone_(data.phone), label: 'client status' },
        { column: CONFIG.HEADERS.statusBusiness1, phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[0]), label: 'business 1 status' },
        { column: CONFIG.HEADERS.statusBusiness2, phone: normalizeGhanaPhone_(CONFIG.BUSINESS_WHATSAPP[1]), label: 'business 2 status' }
      ];
      const pendingStatusChannels = statusChannels.filter(channel => {
        const cell = sheet.getRange(row, headerCol_(sheet, channel.column));
        return !isWhatsAppAccepted_(cell.getDisplayValue());
      }).map(channel => Object.assign(channel, {
        templateProperty: 'WHATSAPP_STATUS_TEMPLATE_NAME',
        parameters: [ref, data.name, status, formatDateTime_(data.date, data.time)]
      }));
      sendWhatsAppTemplatesInParallel_(pendingStatusChannels).forEach(outcome => {
        const channel = outcome.destination;
        sheet.getRange(row, headerCol_(sheet, channel.column)).setValue(outcome.result);
        recordNotificationResult_(sheet, row, 'Retry ' + channel.label, outcome.result);
        retried++;
      });
      const statusResults = [
        CONFIG.HEADERS.statusClient,
        CONFIG.HEADERS.statusBusiness1,
        CONFIG.HEADERS.statusBusiness2
      ].map(column => String(sheet.getRange(row, headerCol_(sheet, column)).getDisplayValue()));
      const summary = statusResults.every(isWhatsAppAccepted_)
        ? 'Accepted by Meta for processing; recipient delivery is not confirmed'
        : 'One or more status notifications failed or are not configured; see per-recipient status and failure log';
      sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusDelivery)).setValue(summary);
      sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.statusWa)).setValue(summary);
    }
  }
  Logger.log('Retried ' + retried + ' failed or unconfigured WhatsApp notification(s).');
  return retried;
}

function requestParamsForRow_(sheet, row, data, ref) {
  return [
    ref, data.name, data.phone, data.service, data.outfits, formatDateTime_(data.date, data.time),
    data.eventDate ? formatDate_(data.eventDate) : 'Not provided', bookingLocation_(data),
    data.contact, data.notes || 'None',
    String(sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.availability)).getDisplayValue())
  ];
}

function recordNotificationResult_(sheet, row, label, result) {
  if (isWhatsAppAccepted_(result)) return;
  const cell = sheet.getRange(row, headerCol_(sheet, CONFIG.HEADERS.failures));
  const previous = String(cell.getValue() || '');
  const entry = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss') + ' | ' + label + ' | ' + result;
  cell.setValue(previous ? previous + '\n' + entry : entry);
}

function isWhatsAppAccepted_(result) {
  return String(result || '').indexOf('ACCEPTED BY META;') === 0;
}

function getBookingSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('CLUSTERGH_SHEET_ID');
  if (!id) throw new Error('Run createClusterGhBookingSystem() first.');
  return SpreadsheetApp.openById(id);
}

function getSetting_(name) {
  const sheet = getBookingSpreadsheet_().getSheetByName('Admin Setup');
  if (!sheet || sheet.getLastRow() < 2) return '';
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (values[i][0] === name) return String(values[i][1] || '').trim();
  return '';
}

function getSettingNumber_(name, fallback) {
  const value = getSetting_(name);
  if (!value) return fallback;
  const number = Number(value);
  if (!isFinite(number) || number < 0) return NaN;
  return number;
}

function bookingLocation_(data) {
  if (data.venue) return data.venue;
  return data.location === 'ClusterGh Studios' ? CONFIG.STUDIO_ADDRESS : data.location;
}

function rowToObject_(sheet, row) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
  const result = {};
  headers.forEach((header, index) => { if (header) result[header] = values[index]; });
  return result;
}

function ensureHeader_(sheet, header) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  if (headers.indexOf(header) === -1) sheet.getRange(1, lastColumn + 1).setValue(header);
}

function headerCol_(sheet, header) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) throw new Error('Missing booking sheet headers. Run setupClusterGh().');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const index = headers.indexOf(header);
  if (index === -1) throw new Error('Missing column: ' + header + '. Run setupClusterGh().');
  return index + 1;
}

function createBookingRef_(sheet) {
  const year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');
  const refColumn = headerCol_(sheet, CONFIG.HEADERS.reference);
  const lastRow = sheet.getLastRow();
  let highest = 0;
  if (lastRow > 1) {
    const refs = sheet.getRange(2, refColumn, lastRow - 1, 1).getDisplayValues();
    refs.forEach(row => {
      const match = row[0].match(new RegExp('^' + CONFIG.PREFIX + '-' + year + '-(\\d{5})$'));
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }
  const properties = PropertiesService.getScriptProperties();
  const key = 'CLUSTERGH_LAST_REF_NUMBER_' + year;
  const next = Math.max(highest, Number(properties.getProperty(key) || 0)) + 1;
  properties.setProperty(key, String(next));
  return CONFIG.PREFIX + '-' + year + '-' + String(next).padStart(5, '0');
}

function combineDateTime_(dateValue, timeValue) {
  const date = parseDate_(dateValue, true);
  const time = timeValue instanceof Date ? Utilities.formatDate(timeValue, CONFIG.TIMEZONE, 'HH:mm') : String(timeValue).trim();
  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) throw new Error('Could not parse booking time: ' + timeValue);
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const dateText = Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  return Utilities.parseDate(dateText + ' ' + String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0'), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function formatDate_(dateValue) {
  const date = parseDate_(dateValue, true);
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function formatDateTime_(dateValue, timeValue) {
  try {
    return Utilities.formatDate(combineDateTime_(dateValue, timeValue), CONFIG.TIMEZONE, 'EEE, d MMM yyyy h:mm a');
  } catch (error) {
    return String(dateValue || '') + ' ' + String(timeValue || '');
  }
}

function normalizeTime_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, CONFIG.TIMEZONE, 'HH:mm');
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return String(value || '').trim();
  let hours = Number(match[1]);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return String(hours).padStart(2, '0') + ':' + match[2];
}

function timeToMinutes_(value) {
  const parts = value.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function normalizeGhanaPhone_(raw) {
  let phone = String(raw || '').replace(/[^\d+]/g, '');
  if (phone.charAt(0) === '+') phone = phone.substring(1);
  if (phone.indexOf('00') === 0) phone = phone.substring(2);
  if (phone.indexOf('0') === 0 && phone.length === 10) phone = '233' + phone.substring(1);
  return /^233\d{9}$/.test(phone) ? phone : '';
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('ClusterGh Bookings')
    .addItem('Retry failed WhatsApp notifications', 'retryFailedNotifications')
    .addItem('Run setup / refresh triggers', 'setupClusterGh')
    .addToUi();
}
