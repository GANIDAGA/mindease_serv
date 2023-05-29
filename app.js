require("dotenv").config();
require("./db");

const express = require("express");
const app = express();

require("./config")(app);

const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);

const chatRoutes = require('./routes/chat.routes');
app.use('/chat', chatRoutes);

const diagnosisRoutes = require("./routes/diagnosis.routes");
app.use("/diagnosis", diagnosisRoutes);

require("./error-handling")(app);

module.exports = app;