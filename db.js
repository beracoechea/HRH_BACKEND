/* credigo-backend/db.js */
const mysql = require('mysql2');
require('dotenv').config();

// Creamos el pool usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Puerto por defecto
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Usamos la versión de promesas
const promisePool = pool.promise();

/**
 * Función helper para consultas rápidas
 * Se recomienda usar .query() en lugar de .execute() para SELECT simples
 */
const rawQuery = async (sql, params) => {
    try {
        const [rows] = await promisePool.query(sql, params);
        return rows;
    } catch (error) {
        console.error("Database Query Error:", error.message);
        throw error;
    }
};

// EXPORTAMOS AMBOS
module.exports = {
    pool: promisePool,
    rawQuery
};
promisePool.getConnection()
    .then(connection => {
        console.log("✅ Conexión exitosa a MySQL: " + process.env.DB_NAME);
        connection.release();
    })
    .catch(err => {
        console.error("❌ Error conectando a la base de datos:", err.message);
    });