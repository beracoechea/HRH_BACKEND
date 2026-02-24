/* utils/mailer.js */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Notificación para Administradores (Mantenemos tu lógica)
const notifyAdminNewRequest = async (admins, solicitud) => {
    const mailOptions = {
        from: `"Sistema CrediGo" <${process.env.EMAIL_USER}>`,
        to: admins,
        subject: '🚨 NUEVA SOLICITUD DE CRÉDITO',
        html: `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #d32f2f;">Nueva Solicitud Detectada</h2>
                <p>El usuario <strong>${solicitud.nombre}</strong> ha solicitado un crédito.</p>
                <hr>
                <p><strong>Detalles:</strong></p>
                <ul>
                    <li><strong>Monto:</strong> $${solicitud.monto}</li>
                    <li><strong>Plazo:</strong> ${solicitud.plazo} meses</li>
                </ul>
                <a href="http://tu-dashboard.com/admin" style="display: inline-block; background: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Gestionar en Panel</a>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

// Notificación para el Cliente con DOCUMENTACIÓN VARIABLE
const notifyUserConfirmation = async (solicitud, documentos) => {
    // Generamos el HTML de la lista de documentos dinámicamente
    const docsHtml = documentos.map(doc => 
        `<li style="margin-bottom: 8px;">🔹 <strong>${doc}</strong></li>`
    ).join('');

    const mailOptions = {
        from: `"CrediGo" <${process.env.EMAIL_USER}>`,
        to: solicitud.email,
        subject: '✅ Tu solicitud está en proceso - Próximos pasos',
        html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 25px; border-radius: 15px;">
                <h1 style="color: #2e7d32;">¡Hola, ${solicitud.nombre}!</h1>
                <p style="font-size: 16px;">Hemos recibido tu solicitud de crédito por <strong>$${solicitud.monto}</strong>.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 5px solid #1976d2;">
                    <p style="margin-top: 0;"><strong>⚠️ Acción requerida:</strong></p>
                    <p>Para continuar con la aprobación, es necesario que subas los siguientes documentos a tu portal:</p>
                    <ul style="list-style: none; padding-left: 10px;">
                        ${docsHtml}
                    </ul>
                </div>

                <p style="margin-top: 25px;">Una vez validados, te enviaremos el <strong>Contrato Digital</strong> para tu firma electrónica.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://tu-plataforma.com/mi-perfil" style="background: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">Subir Documentos Ahora</a>
                </div>

                <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

module.exports = { notifyAdminNewRequest, notifyUserConfirmation };