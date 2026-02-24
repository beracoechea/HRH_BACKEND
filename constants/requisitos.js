// Documentos que se piden en ABSOLUTAMENTE todos los créditos
const DOCS_BASE = [
    'INE Vigente', 
    'Comprobante de Domicilio',
    'Carta de Situación Fiscal',
    'CURP'
];

const REQUISITOS_CREDITO = {
    PERSONAL: [
        ...DOCS_BASE, 
        'Últimos 3 recibos de nómina'
    ],
    AUTOMOTRIZ: [
        ...DOCS_BASE, 
        'Carta de Ingresos', 
        'Cotización de la Agencia'
    ],
};

const ESTADOS_CREDITO = {
    PENDIENTE: 'pendiente',
    ACTIVO: 'activo',
    RECHAZADO: 'rechazado',
    PAGADO: 'pagado'
};

module.exports = { REQUISITOS_CREDITO, ESTADOS_CREDITO };