import app from "./app";
import { db } from "./db";

process.on("uncaughtException", (err) => {
  console.log(err);
  // process.exit(0);
});

const startServer = async () => {
  try {
    // Basic database connectivity check
    await db.execute("SELECT 1");
    console.log("Database connection successful");

    // Start the server
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
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
