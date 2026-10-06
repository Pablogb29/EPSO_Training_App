import { pick, randomId, writeQuestions } from './utils';

const DEFAULT_QUESTION = '¿Cuál de las siguientes afirmaciones es correcta?';

const templates = [
  {
    passage:
      'El sueño REM desempeña un papel en la consolidación de la memoria. Las personas privadas de sueño suelen mostrar mayor irritabilidad y peor rendimiento en tareas que requieren atención sostenida. No obstante, la cantidad de sueño necesaria varía entre individuos y no existe una cifra única válida para toda la población adulta.',
    options: [
      'Todas las personas adultas necesitan exactamente ocho horas de sueño.',
      'La privación de sueño puede afectar al rendimiento en tareas de atención.',
      'El sueño REM no tiene relación con la memoria.',
      'La irritabilidad nunca está asociada a la falta de sueño.',
    ],
    correct: 1,
    explanation:
      'El texto indica que la privación de sueño empeora tareas de atención y que la cantidad necesaria varía entre individuos.',
  },
  {
    passage:
      'Los mercados de agricultores permiten a productores locales vender directamente al consumidor. Suelen reducir intermediarios, aunque los precios no siempre son inferiores a los de supermercados porque reflejan costes de producción a pequeña escala. En muchas ciudades europeas se celebran semanalmente y fomentan productos de temporada.',
    options: [
      'En mercados de agricultores los precios son siempre más bajos que en supermercados.',
      'Los productos de temporada pueden encontrarse en muchos mercados locales europeos.',
      'Estos mercados impiden vender directamente al consumidor.',
      'Solo se venden productos importados en mercados de agricultores.',
    ],
    correct: 1,
    explanation:
      'El pasaje indica que se fomentan productos de temporada y venta directa; no garantiza precios más bajos.',
  },
  {
    passage:
      'Los parques urbanos aportan sombra, reducen islas de calor y ofrecen espacio para el ocio. Mantenerlos requiere riego, poda y vigilancia. Algunos estudios sugieren que la proximidad a zonas verdes se asocia con menor estrés percibido, aunque la relación puede verse influida por otros factores socioeconómicos del barrio.',
    options: [
      'Los parques urbanos no influyen en la temperatura de la ciudad.',
      'El mantenimiento de parques no requiere recursos.',
      'La cercanía a zonas verdes puede asociarse con menor estrés percibido.',
      'Todos los estudios demuestran causalidad directa sin otros factores.',
    ],
    correct: 2,
    explanation:
      'El texto menciona asociación con menor estrés percibido, reconociendo posibles factores confusos.',
  },
  {
    passage:
      'La reciclaje de papel ahorra agua y energía frente a la fabricación con fibra virgen, pero el papel no puede reciclarse indefinidamente porque las fibras se acortan en cada ciclo. Por ello suele mezclarse con fibra nueva en la producción de ciertos productos.',
    options: [
      'El papel puede reciclarse un número ilimitado de veces sin perder calidad.',
      'Reciclar papel puede ahorrar agua y energía respecto a fibra virgen.',
      'La fibra nueva nunca se utiliza en productos reciclados.',
      'Reciclar papel consume siempre más energía que la fibra virgen.',
    ],
    correct: 1,
    explanation:
      'El pasaje indica ahorro de agua y energía, pero también que las fibras se acortan y a menudo se mezclan con fibra nueva.',
  },
  {
    passage:
      'Los museos de historia natural conservan colecciones de fósiles, minerales y especímenes que documentan la biodiversidad pasada y presente. Muchos dedican recursos a la digitalización de catálogos para facilitar la investigación internacional, sin sustituir por completo el estudio de piezas físicas.',
    options: [
      'La digitalización sustituye por completo el estudio de especímenes físicos.',
      'Las colecciones pueden incluir fósiles y minerales.',
      'Los museos de historia natural no colaboran con la investigación.',
      'Los catálogos digitales impiden el acceso internacional.',
    ],
    correct: 1,
    explanation:
      'El texto enumera fósiles y minerales entre las colecciones y indica que la digitalización no sustituye por completo el estudio físico.',
  },
];

const categories = [
  'Medio ambiente',
  'Cocina',
  'Tradiciones',
  'Transporte',
  'Salud pública',
  'Arqueología',
  'Economía',
  'Meteorología',
  'Educación',
  'Astronomía',
];

function generate(count: number) {
  const questions = [];
  const shuffledTemplates = [...templates].sort(() => Math.random() - 0.5);
  const usedPassages = new Set<string>();

  for (let i = 0; i < count; i++) {
    const template = shuffledTemplates[i % shuffledTemplates.length];
    if (usedPassages.has(template.passage)) continue;
    usedPassages.add(template.passage);

    questions.push({
      id: randomId('verbal-gen'),
      type: 'verbal',
      difficulty: (Math.floor(Math.random() * 3) + 2) as 2 | 3 | 4,
      category: pick(categories),
      tags: ['generado'],
      passage: template.passage,
      question: DEFAULT_QUESTION,
      options: template.options,
      correctAnswer: template.correct,
      explanation: template.explanation,
    });
  }

  return questions;
}

const count = Number(process.argv[2]) || 5;
writeQuestions('verbal.generated.json', generate(count));
