import { pick, randomId, writeQuestions } from './utils';

const topics: Array<{
  q: string;
  options: string[];
  correct: number;
  cat: string;
  tags: string[];
  exp: string;
}> = [
  {
    q: '¿A qué asigna principalmente permisos RBAC?',
    options: ['Usuarios individuales', 'Roles', 'Direcciones IP', 'Ventanas horarias'],
    correct: 1,
    cat: 'IAM',
    tags: ['RBAC'],
    exp: 'RBAC asigna permisos a roles, que los usuarios heredan al pertenecer a ellos.',
  },
  {
    q: '¿Qué protocolo se usa habitualmente para SSO federado en entornos empresariales?',
    options: ['FTP', 'SAML', 'SMTP', 'SNMP'],
    correct: 1,
    cat: 'Protocolos',
    tags: ['SAML', 'OAuth2', 'OIDC'],
    exp: 'SAML se usa ampliamente para inicio de sesión único federado entre proveedores de identidad y de servicio.',
  },
  {
    q: '¿Qué protege principalmente TLS?',
    options: [
      'Datos en reposo en disco',
      'Datos en tránsito',
      'Acceso físico al datacenter',
      'Integridad de copias de seguridad',
    ],
    correct: 1,
    cat: 'Criptografía',
    tags: ['TLS', 'PKI'],
    exp: 'TLS cifra y autentica los datos en tránsito entre cliente y servidor.',
  },
  {
    q: 'En MITRE ATT&CK, las técnicas describen:',
    options: [
      'Versiones de parches',
      'Comportamientos y métodos del adversario',
      'Tipos de cable de red',
      'Políticas de RR. HH.',
    ],
    correct: 1,
    cat: 'Inteligencia de amenazas',
    tags: ['MITRE ATT&CK'],
    exp: 'Las técnicas ATT&CK describen cómo los adversarios alcanzan objetivos tácticos.',
  },
  {
    q: 'CVSS se utiliza principalmente para:',
    options: [
      'Puntuar la severidad de vulnerabilidades',
      'Cifrar correos',
      'Gestionar grupos de Active Directory',
      'Auditar informes financieros',
    ],
    correct: 0,
    cat: 'Gestión de vulnerabilidades',
    tags: ['CVSS'],
    exp: 'CVSS proporciona una forma estandarizada de puntuar la severidad de vulnerabilidades.',
  },
  {
    q: '¿Qué servicio de AWS gestiona claves de cifrado en la nube?',
    options: ['AWS KMS', 'AWS SNS', 'AWS SQS', 'AWS CloudFront'],
    correct: 0,
    cat: 'Seguridad cloud',
    tags: ['AWS', 'cifrado'],
    exp: 'AWS Key Management Service (KMS) crea y controla claves de cifrado.',
  },
  {
    q: '¿Cuál es el objetivo principal de NIS2?',
    options: [
      'Fortalecer la ciberseguridad de entidades esenciales e importantes en sectores clave',
      'Regular solo instituciones de la UE',
      'Proteger exclusivamente smartphones de consumo',
      'Gestionar sistemas militares',
    ],
    correct: 0,
    cat: 'Cumplimiento normativo',
    tags: ['NIS2', 'RGPD'],
    exp: 'NIS2 amplía las obligaciones de ciberseguridad para entidades esenciales e importantes en sectores críticos.',
  },
  {
    q: 'Kerberos se asocia principalmente con:',
    options: [
      'Autenticación de red en dominios Windows',
      'Orquestación de contenedores',
      'Agregación de logs',
      'Alojamiento de sitios estáticos',
    ],
    correct: 0,
    cat: 'Gestión de identidades',
    tags: ['Kerberos', 'Active Directory'],
    exp: 'Kerberos es el protocolo de autenticación por defecto en dominios Active Directory.',
  },
];

function generate(count: number) {
  const questions = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(Math.random() * topics.length);
    while (used.has(idx) && used.size < topics.length)
      idx = Math.floor(Math.random() * topics.length);
    used.add(idx);
    const t = topics[idx] ?? pick(topics);
    questions.push({
      id: randomId('technical-gen'),
      type: 'technical',
      difficulty: (Math.floor(Math.random() * 3) + 2) as 2 | 3 | 4,
      category: t.cat,
      tags: t.tags,
      question: t.q,
      options: t.options,
      correctAnswer: t.correct,
      explanation: t.exp,
    });
  }
  return questions;
}

const count = Number(process.argv[2]) || 5;
writeQuestions('technical.generated.json', generate(count));
