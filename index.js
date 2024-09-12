const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your verify token
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Replace with your verification token
const PAGE_ACCESS_TOKENS = {
  [process.env.PAGE_ID_1]: process.env.PAGE_ACCESS_TOKEN_1,
  [process.env.PAGE_ID_2]: process.env.PAGE_ACCESS_TOKEN_2,
};

console.log({ VERIFY_TOKEN, PAGE_ACCESS_TOKENS });

app.use(bodyParser.json());

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Handling incoming messages
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      // Get the page ID to identify which page the event is from
      const pageId = entry.id;
      console.log({ pageId });

      // Check if the page ID exists in the PAGE_ACCESS_TOKENS mapping
      if (!PAGE_ACCESS_TOKENS[pageId]) {
        console.log(`No access token configured for page ID: ${pageId}`);
        return;
      }

      // Process each event from the page
      entry.messaging.forEach((webhookEvent) => {
        const senderPsid = webhookEvent.sender.id;
        if (webhookEvent.message) {
          handleMessage(senderPsid, webhookEvent.message, pageId);
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Handles messages events
function handleMessage(senderPsid, receivedMessage, pageId) {
  let response;

  if (receivedMessage.text) {
    response = {
      text: `You sent the message: "${receivedMessage.text}" from page ${pageId}.`,
    };
  }

  // Sends the response message using the correct page access token
  callSendAPI(senderPsid, response, pageId);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response, pageId) {
  const requestBody = {
    recipient: {
      id: senderPsid,
    },
    message: response,
  };

  // Get the correct access token based on the page ID
  const pageAccessToken = PAGE_ACCESS_TOKENS[pageId];

  axios
    .post(
      `https://graph.facebook.com/v15.0/me/messages?access_token=${pageAccessToken}`,
      requestBody
    )
    .then(() => {
      console.log('Message sent!');
    })
    .catch((error) => {
      console.error('Error sending message:', error);
    });
}

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
