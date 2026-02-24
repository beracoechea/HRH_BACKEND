/* src/utils/googleDriveConfig.js */
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

// Cargamos las credenciales desde el archivo JSON que guardaste
const KEYFILEPATH = path.join(__dirname, '../config/google-keys.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

/* utils/googleDriveConfig.js */
const createFolder = async (folderName) => {
    try {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Carpeta raíz de la Unidad Compartida
        };

        const folder = await drive.files.create({
            requestBody: fileMetadata,
            supportsAllDrives: true,
            fields: 'id',
        });

        return folder.data.id;
    } catch (error) {
        console.error("Error creando carpeta en Drive:", error);
        throw error;
    }
};

const uploadToDrive = async (fileObject, customName, targetFolderId) => {
    try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileObject.buffer);

        const response = await drive.files.create({
            requestBody: {
                name: customName,
                parents: [targetFolderId], // Subir a la carpeta del crédito
            },
            media: {
                mimeType: fileObject.mimetype,
                body: bufferStream,
            },
            supportsAllDrives: true,
            fields: 'id, webViewLink',
        });

        return response.data;
    } catch (error) {
        console.error("Error en Drive API:", error.message);
        throw error;
    }
};

module.exports = { uploadToDrive, createFolder };