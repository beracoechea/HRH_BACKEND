// index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 

// Importación de routers modularizados
const authRoutes = require('./routes/auth.routes');
const citasRoutes = require('./routes/cita.routes');
const blogRoutes = require('./routes/blog.routes');
const chatRoutes = require('./routes/chat.routes');
const creditosRoutes = require('./routes/credito.routes');
const documentRoutes = require('./routes/document.routes');

const app = express();


// HELMET: Configura cabeceras de seguridad automáticamente
app.use(helmet()); 

// En producción, cambia '*' por tu dominio real (ej. 'https://tuapp.com')
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

//RATE LIMITER: Protege contra ataques de denegación de servicio (DoS)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // Máximo 50 peticiones por IP en ese tiempo
    message: { message: "Demasiadas peticiones, intenta más tarde." }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' }));

// --- CONEXIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);  
app.use('/api/citas', citasRoutes); 
app.use('/api/blogs', blogRoutes); 
app.use('/api/chat', chatRoutes);   
app.use('/api/creditos', creditosRoutes); 
app.use('/api/documents', documentRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Recurso no encontrado" });
});

app.listen(5000, () => {
    console.log('🚀 Servidor blindado y modular en puerto 5000');
});