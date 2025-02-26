const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config();

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const auth = new google.auth.GoogleAuth({
  credentials:JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });
const FOLDER_ID = "1b7a0nvBsAQDWXUSpZ0VKM89QL_nabzE5";
const FILE_NAME = "recipee.db";
const FILE_PATH = path.join(__dirname, FILE_NAME);

async function getFileId(fileName) {
  const res = await drive.files.list({
    q: `name='${fileName}' and '${FOLDER_ID}' in parents`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return res.data.files.length > 0 ? res.data.files[0].id : null;
}

async function uploadFile() {
  try {
    const fileId = await getFileId(FILE_NAME);
    const media = { body: fs.createReadStream(FILE_PATH) };

    if (fileId) {
      // Update existing file
      await drive.files.update({
        fileId: fileId,
        media: media,
      });
      console.log("✅ File updated successfully");
    } else {
      // Upload new file
      const response = await drive.files.create({
        requestBody: { name: FILE_NAME, parents: [FOLDER_ID] },
        media: media,
      });
      console.log("✅ File uploaded successfully:", response.data);
    }
  } catch (error) {
    console.error("❌ Error uploading file:", error.message);
  }
}

async function downloadFile() {
  try {
    const fileId = await getFileId(FILE_NAME);
    if (!fileId) {
      console.log("⚠️ File not found on Google Drive.");
      return;
    }

    const filePath = path.join(__dirname, FILE_NAME);
    const dest = fs.createWriteStream(filePath);

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    response.data
      .pipe(dest)
      .on("finish", () => console.log("✅ File downloaded successfully!"))
      .on("error", (error) => console.error("❌ Error downloading file:", error));
  } catch (error) {
    console.error("❌ Error downloading file:", error.message);
  }
}



module.exports = { uploadFile, downloadFile };
