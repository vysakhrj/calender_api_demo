const express = require('express');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const GoogleCalendarService = require('./googleCalendar');
const fs = require('fs');

const app = express();
const port = 3000;
const calendarService = new GoogleCalendarService();

app.use(bodyParser.json());

const TOKEN_PATH = './token.json';

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Google Calendar API',
      version: '1.0.0',
      description: 'Google Calendar API Integration',
    },
    servers: [{ url: `http://localhost:${port}` }],
  },
  apis: [__filename],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /initialize:
 *   get:
 *     summary: Get authentication URL
 *     responses:
 *       200:
 *         description: URL to authenticate user.
 */
app.get('/initialize', (req, res) => {
  const authUrl = calendarService.getAuthUrl();
  res.json(authUrl);
});

/**
 * @swagger
 * /oauthcallback:
 *   get:
 *     summary: Handle OAuth2 callback
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from Google.
 *     responses:
 *       200:
 *         description: Token saved successfully.
 */
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code is required');
  }

  try {
    await calendarService.initialize(code);
    const token = calendarService.oauth2Client.credentials;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    res.send('Token saved successfully.');
  } catch (error) {
    res.status(500).send(`Error saving token: ${error.message}`);
  }
});

/**
 * @swagger
 * /createEvent:
 *   post:
 *     summary: Create a new event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calendarId:
 *                 type: string
 *                 example: "primary"
 *               eventDetails:
 *                 type: object
 *                 properties:
 *                   summary:
 *                     type: string
 *                     example: "Team Meeting"
 *                   location:
 *                     type: string
 *                     example: "1234 Main St, Anytown, USA"
 *                   description:
 *                     type: string
 *                     example: "Discuss project updates and roadblocks."
 *                   start:
 *                     type: object
 *                     properties:
 *                       dateTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-12-21T10:00:00-07:00"
 *                       timeZone:
 *                         type: string
 *                         example: "America/Denver"
 *                   end:
 *                     type: object
 *                     properties:
 *                       dateTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-12-21T11:00:00-07:00"
 *                       timeZone:
 *                         type: string
 *                         example: "America/Denver"
 *                   attendees:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           example: "johndoe@example.com"
 *                   reminders:
 *                     type: object
 *                     properties:
 *                       useDefault:
 *                         type: boolean
 *                         example: false
 *                       overrides:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             method:
 *                               type: string
 *                               example: "email"
 *                             minutes:
 *                               type: integer
 *                               example: 1440
 *     responses:
 *       200:
 *         description: Event created successfully.
 *       401:
 *         description: Token not found.
 */

app.post('/createEvent', async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return res.status(401).send('Token not found. Please authenticate first.');
  }

  const { calendarId, eventDetails } = req.body;

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    calendarService.oauth2Client.setCredentials(token);
    const event = await calendarService.addEvent(calendarId, eventDetails);
    res.status(200).json(event);
  } catch (error) {
    res.status(500).send(`Error creating event: ${error.message}`);
  }
});

/**
 * @swagger
 * /updateEvent:
 *   put:
 *     summary: Update an event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calendarId:
 *                 type: string
 *               eventId:
 *                 type: string
 *               eventDetails:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event updated successfully.
 *       401:
 *         description: Token not found.
 */
app.put('/updateEvent', async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return res.status(401).send('Token not found. Please authenticate first.');
  }

  const { calendarId, eventId, eventDetails } = req.body;

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    calendarService.oauth2Client.setCredentials(token);
    const event = await calendarService.updateEvent(calendarId, eventId, eventDetails);
    res.status(200).json(event);
  } catch (error) {
    res.status(500).send(`Error updating event: ${error.message}`);
  }
});

/**
 * @swagger
 * /deleteEvent:
 *   delete:
 *     summary: Delete an event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calendarId:
 *                 type: string
 *               eventId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully.
 *       401:
 *         description: Token not found.
 */
app.delete('/deleteEvent', async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return res.status(401).send('Token not found. Please authenticate first.');
  }

  const { calendarId, eventId } = req.body;

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    calendarService.oauth2Client.setCredentials(token);
    await calendarService.deleteEvent(calendarId, eventId);
    res.status(200).send({ message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).send(`Error deleting event: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/api-docs/`);
});
