import { createServer } from "http";
import app from "./app";
import { db } from "./db";
import "dotenv/config";

import { setUpSocket } from "./socket";

process.on("uncaughtException", (err) => {
  console.log(err);
  // process.exit(0);
});

const startServer = async () => {
  try {
    // Basic database connectivity check
    await db.execute("SELECT 1");
    console.log("Connected to database successfully!!!");

    const server = createServer(app);
    setUpSocket(server);
    console.log("Socket.IO setup complete!");

    // Start the server
    const port = process.env.PORT || 4000;
    server.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  // server.close(() => process.exit(0));
});

startServer();
