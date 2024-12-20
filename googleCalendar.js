const { google } = require('googleapis');
const constants = require('./constants');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      constants.clientId,
      constants.clientSecret,
      constants.redirectUri
    );
    this.calendar = null;
  }

  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async initialize(code) {
    if (!this.calendar) {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
  }

  async addEvent(calendarId, eventDetails) {
    const response = await this.calendar.events.insert({
      calendarId,
      resource: eventDetails,
    });
    return response.data;
  }

  async updateEvent(calendarId, eventId, eventDetails) {
    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      resource: eventDetails,
    });
    return response.data;
  }

  async deleteEvent(calendarId, eventId) {
    await this.calendar.events.delete({
      calendarId,
      eventId,
    });
    return { message: 'Event deleted successfully' };
  }
}

module.exports = GoogleCalendarService;
