//Multer receives the uploaded file, stores it (usually on disk in your project), creates a JavaScript-friendly req.file object containing metadata about the file, and then passes control to the next middleware/controller.

import dotenv from "dotenv";

dotenv.config();
import multer from "multer";
import path from 'path'
import { fileURLToPath } from "url";
import fs, { mkdir } from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//this below line adds directory name before /uploads/documents for final path
const uploadDir = path.join(__dirname, '../uploads/documents');
//this below line is saying that if the folder doesnt exist create one.
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

//configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

//file filter - only pdfs
const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'application/pdf') {
        cb(null, true);
    } else{
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

//configure multer
 const upload = multer({
   storage: storage,
   fileFilter: fileFilter,
   limits: {
     fileSize: parseInt(process.env.SIZE) || 10485760, // 10mb by default
   },
 });

 export default upload