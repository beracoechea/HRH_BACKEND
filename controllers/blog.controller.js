/* src/controllers/blog.controller.js */
const { rawQuery } = require('../db');

exports.getBlogsAdmin = async (req, res) => {
    try {
        const blogs = await rawQuery("SELECT * FROM blogs ORDER BY id DESC");
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener blogs" });
    }
};

exports.getBlogsPublic = async (req, res) => {
    try {
        const sql = "SELECT * FROM blogs WHERE activa = 1 ORDER BY fecha_publicacion DESC";
        const blogs = await rawQuery(sql);
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ error: "Error al cargar noticias" });
    }
};

exports.saveBlog = async (req, res) => {
    try {
        const { titulo, categoria, fecha_publicacion, subido_por, descripcion, link_consulta, imagen_url, activa } = req.body;
        const sql = `INSERT INTO blogs (titulo, categoria, fecha_publicacion, subido_por, descripcion, link_consulta, imagen_url, activa) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await rawQuery(sql, [titulo, categoria, fecha_publicacion, subido_por, descripcion, link_consulta, imagen_url, activa ? 1 : 0]);
        res.json({ message: "Guardado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        await rawQuery("DELETE FROM blogs WHERE id = ?", [req.params.id]);
        res.json({ message: "Eliminado" });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar" });
    }
};