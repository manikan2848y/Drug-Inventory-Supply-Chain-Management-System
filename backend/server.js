const express = require("express");
const bodyParser = require("body-parser");
//const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const { OpenAI } = require('openai'); // Import OpenAI SDK

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://drug-43964-default-rtdb.firebaseio.com"
});

const db = admin.database(); // Firebase Realtime Database reference
const inventoryRef = db.ref("inventory");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: 'your-openai-api-key-here',  // Use your OpenAI API key
});

// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes for the frontend pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

app.get("/feedback", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/feedback.html"));
});

app.get("/help", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/help.html"));
});

app.get("/inventory", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/inventory.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// Routes for the API functionality (Inventory)

app.get("/api/inventory", async (req, res) => {
  try {
    const snapshot = await inventoryRef.once("value");
    const inventory = [];
    snapshot.forEach((childSnapshot) => {
      const item = { id: childSnapshot.key, ...childSnapshot.val() };
      inventory.push(item);
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

app.post("/api/inventory", async (req, res) => {
  const { name, quantity, category } = req.body;

  if (!name || !quantity || !category) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const snapshot = await inventoryRef.once("value");
    let itemExists = false;
    let itemKey = null;
    let existingQuantity = 0;

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (
        data.name.toLowerCase() === name.toLowerCase() &&
        data.category.toLowerCase() === category.toLowerCase()
      ) {
        itemExists = true;
        itemKey = childSnapshot.key;
        existingQuantity = data.quantity;
      }
    });

    if (itemExists) {
      const updatedQuantity = existingQuantity + parseInt(quantity);
      await inventoryRef.child(itemKey).set({
        name,
        quantity: updatedQuantity,
        category,
      });
      res.json({ message: "Item updated successfully." });
    } else {
      const newItemRef = inventoryRef.push();
      await newItemRef.set({
        name,
        quantity: parseInt(quantity),
        category,
      });
      res.json({ message: "Item added successfully." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to add or update item." });
  }
});

// Add more inventory routes here...

// Routes for Chatbot API (OpenAI Integration)

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',  // or gpt-3.5
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: userMessage },
      ],
    });

    const botResponse = response.choices[0].message.content;
    res.json({ response: botResponse });
  } catch (error) {
    res.status(500).json({ error: "Failed to get response from AI service." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
