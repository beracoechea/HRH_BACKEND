const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf" || 
            file.mimetype === "image/jpeg" || 
            file.mimetype === "image/png") {
            cb(null, true);
        } else {
            cb(new Error("Formato de archivo no soportado. Usa PDF, JPG o PNG."), false);
        }
    }
});

module.exports = upload;