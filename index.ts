import express from "express";
import pino from "pino";
import dotenv from "dotenv";
import { asCloudTool, FragolaCloud } from "./fragolaCloud/FragolaCloud";
import { cloneRepoTool } from "./tools/cloneRepo/cloneRepo.tool";
import { readFileById } from "./tools/readFileById/readFileById.tool";
import { authtoken } from "ngrok";
import { grepCodebaseTool } from "./tools/grepCodebase/grepCodebase.tool";
import { $ } from "bun";
import fs from "fs";
import path from "path";

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

// Cleanup function for old temporary folders
const cleanupOldTmpFolders = () => {
  const tmpDir = './tmp';
  const cleanTimeMinutes = parseInt(process.env.TMP_CLEAN_AFTER || '30');
  
  console.log(`Looking for old tmp folders older than ${cleanTimeMinutes} minutes...`);
  
  // Check if tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    console.log('No ./tmp directory found, skipping cleanup');
    return;
  }
  
  try {
    const now = Date.now();
    const cutoffTime = now - (cleanTimeMinutes * 60 * 1000); // Convert minutes to milliseconds
    
    console.log(`Current time: ${new Date(now).toISOString()}`);
    console.log(`Cutoff time: ${new Date(cutoffTime).toISOString()}`);
    
    const folders = fs.readdirSync(tmpDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    let deletedCount = 0;
    
    for (const folder of folders) {
      const folderPath = path.join(tmpDir, folder);
      const stats = fs.statSync(folderPath);
      
      // Use modification time (mtimeMs) which is more reliable than birth time
      const folderTime = Math.max(stats.mtimeMs, stats.ctimeMs);
      const ageMinutes = (now - folderTime) / (60 * 1000);
      
      console.log(`Folder: ${folder}, Age: ${ageMinutes.toFixed(2)} minutes, Created: ${new Date(folderTime).toISOString()}`);
      
      if (folderTime < cutoffTime) {
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
          console.log(`Deleted old tmp folder: ${folderPath} (${ageMinutes.toFixed(2)} minutes old)`);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete folder ${folderPath}:`, error);
        }
      } else {
        console.log(`Keeping folder: ${folder} (only ${ageMinutes.toFixed(2)} minutes old)`);
      }
    }
    
    if (deletedCount === 0) {
      console.log('No old tmp folders found to delete');
    } else {
      console.log(`Cleanup completed: deleted ${deletedCount} folder(s)`);
    }
  } catch (error) {
    console.error('Error during tmp cleanup:', error);
  }
};

// Start cleanup interval (every 10 seconds)
setInterval(cleanupOldTmpFolders, 10000);

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
});
