const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000 // 30 seconds timeout
});

async function run() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    console.log("Connected successfully to server");
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Ping successful. DB is accessible.");
  } catch (err) {
    console.error("Connection failed!");
    console.error("Error Code:", err.code);
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
  } finally {
    await client.close();
  }
}

run();
