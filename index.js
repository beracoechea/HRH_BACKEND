// index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // 1. Importar Helmet
const rateLimit = require('express-rate-limit'); // Sugerido: para ataques de fuerza bruta

// Importación de routers modularizados
const authRoutes = require('./routes/auth.routes');
const citasRoutes = require('./routes/cita.routes');
const blogRoutes = require('./routes/blog.routes');
const chatRoutes = require('./routes/chat.routes');
const creditosRoutes = require('./routes/credito.routes');
const documentRoutes = require('./routes/document.routes');

const app = express();

// --- CONFIGURACIÓN DE SEGURIDAD GLOBAL ---

// 2. HELMET: Configura cabeceras de seguridad automáticamente
// Oculta que usas Express y previene que tu web sea embebida en sitios maliciosos
app.use(helmet()); 

// 3. CORS: Configuración segura
// En producción, cambia '*' por tu dominio real (ej. 'https://tuapp.com')
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 4. RATE LIMITER: Protege contra ataques de denegación de servicio (DoS)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 peticiones por IP en ese tiempo
    message: { message: "Demasiadas peticiones, intenta más tarde." }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' })); // Limita el tamaño del body para evitar ataques de carga masiva

// --- CONEXIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);  
app.use('/api/citas', citasRoutes); 
app.use('/api/blogs', blogRoutes); 
app.use('/api/chat', chatRoutes);   
app.use('/api/creditos', creditosRoutes); 
app.use('/api/documents', documentRoutes);

// Manejo de rutas no encontradas (404) - Evita fugas de estructura
app.use((req, res) => {
    res.status(404).json({ message: "Recurso no encontrado" });
});

app.listen(5000, () => {
    console.log('🚀 Servidor blindado y modular en puerto 5000');
});