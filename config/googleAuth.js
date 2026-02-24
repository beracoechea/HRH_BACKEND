const { google } = require('googleapis');
const path = require('path');

const KEYFILEPATH = path.join(process.cwd(), 'config', 'google-keys.json');
const keys = require(KEYFILEPATH);

const authClient = new google.auth.JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    subject: 'joserosales@strategofirma.com'
});

const calendar = google.calendar({ version: 'v3', auth: authClient });

module.exports = { authClient, calendar };