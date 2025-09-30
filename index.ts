import express from "express";
import pino from "pino";
import dotenv from "dotenv";
import { asCloudTool, FragolaCloud } from "./fragolaCloud/FragolaCloud";
import { cloneRepoTool } from "./tools/cloneRepo/cloneRepo.tool";
import { readFileById } from "./tools/readFileById/readFileById.tool";
import { authtoken } from "ngrok";
import { grepCodebaseTool } from "./tools/grepCodebase/grepCodebase.tool";
import { $ } from "bun";

// Load environment variables
dotenv.config();

const app = express();

// Express middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fragolaCloud = new FragolaCloud(app);
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "hello world" });
});

// Exposing tools for eleven labs
fragolaCloud.exposeTool(asCloudTool(cloneRepoTool));
fragolaCloud.exposeTool(asCloudTool(readFileById));
fragolaCloud.exposeTool(asCloudTool(grepCodebaseTool));

// Lancer le serveur
app.listen(PORT, async () => {
    console.log(`Fragola cloud started on http://localhost:${PORT}`);
  // if (!process.env["PROD"]) {
  //   console.log(PORT);
  //   try {
  //     const ngrok = require('ngrok');
  //     const url = await ngrok.connect(PORT, {authtoken: process.env["NGROK_AUTH_TOKEN"]});
  //     log.info(`Fragola cloud started on http://localhost:${PORT} | Ngrok tunnel open at ${url}`);
  //   } catch (error) {
  //     console.log(JSON.stringify(error))
  //     log.error(`Failed to connect ngrok: ${error instanceof Error ? error.message : String(error)}`);
  //   }
  // } else {
  //   //TODO: handle prod log
  // }
  fragolaCloud.logExposedTools();
  try {
    console.log("__doing ls");
    const response = await $`ls /opt/render/.ssh`.text();
    console.log("__ls: ", response);
  } catch(e) {
    console.error("ls failed", e);
  }
});
