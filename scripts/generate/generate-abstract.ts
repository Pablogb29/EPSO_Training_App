import { pick, randomId, writeQuestions } from './utils';

type Rule = 'rotation' | 'color' | 'count' | 'position';

const rules: Record<
  Rule,
  { prompt: string; svg: string; options: string[]; correct: number; exp: string }
> = {
  rotation: {
    prompt: '¿Qué figura completa la secuencia de rotación?',
    svg: "<svg viewBox='0 0 200 50' xmlns='http://www.w3.org/2000/svg'><rect x='10' y='10' width='20' height='20' fill='#3b82f6' transform='rotate(0 20 20)'/><rect x='50' y='10' width='20' height='20' fill='#3b82f6' transform='rotate(45 60 20)'/><rect x='90' y='10' width='20' height='20' fill='#3b82f6' transform='rotate(90 100 20)'/><text x='130' y='28' fill='#94a3b8'>?</text></svg>",
    options: [
      "<svg viewBox='0 0 40 40'><rect x='10' y='10' width='20' height='20' fill='#3b82f6' transform='rotate(135 20 20)'/></svg>",
      "<svg viewBox='0 0 40 40'><rect x='10' y='10' width='20' height='20' fill='#3b82f6' transform='rotate(90 20 20)'/></svg>",
      "<svg viewBox='0 0 40 40'><circle cx='20' cy='20' r='10' fill='#3b82f6'/></svg>",
      "<svg viewBox='0 0 40 40'><rect x='10' y='10' width='20' height='20' fill='#ef4444' transform='rotate(135 20 20)'/></svg>",
    ],
    correct: 0,
    exp: 'La rotación aumenta 45° en cada paso: 0° → 45° → 90° → 135°.',
  },
  color: {
    prompt: '¿Qué figura continúa la alternancia de colores?',
    svg: "<svg viewBox='0 0 200 50' xmlns='http://www.w3.org/2000/svg'><circle cx='20' cy='25' r='10' fill='#3b82f6'/><circle cx='60' cy='25' r='10' fill='#ef4444'/><circle cx='100' cy='25' r='10' fill='#3b82f6'/><text x='130' y='28' fill='#94a3b8'>?</text></svg>",
    options: [
      "<svg viewBox='0 0 40 40'><circle cx='20' cy='20' r='10' fill='#ef4444'/></svg>",
      "<svg viewBox='0 0 40 40'><circle cx='20' cy='20' r='10' fill='#3b82f6'/></svg>",
      "<svg viewBox='0 0 40 40'><rect x='10' y='10' width='20' height='20' fill='#ef4444'/></svg>",
      "<svg viewBox='0 0 40 40'><circle cx='20' cy='20' r='15' fill='#ef4444'/></svg>",
    ],
    correct: 0,
    exp: 'Los colores alternan azul-rojo-azul; el siguiente debe ser rojo.',
  },
  count: {
    prompt: '¿Cuántas formas aparecen a continuación?',
    svg: "<svg viewBox='0 0 200 50' xmlns='http://www.w3.org/2000/svg'><circle cx='15' cy='25' r='6' fill='#22c55e'/><g transform='translate(40,0)'><circle cx='10' cy='25' r='6' fill='#22c55e'/><circle cx='25' cy='25' r='6' fill='#22c55e'/></g><g transform='translate(80,0)'><circle cx='8' cy='25' r='6' fill='#22c55e'/><circle cx='20' cy='25' r='6' fill='#22c55e'/><circle cx='32' cy='25' r='6' fill='#22c55e'/></g><text x='130' y='28' fill='#94a3b8'>?</text></svg>",
    options: [
      "<svg viewBox='0 0 60 40'><circle cx='8' cy='20' r='6' fill='#22c55e'/><circle cx='20' cy='20' r='6' fill='#22c55e'/><circle cx='32' cy='20' r='6' fill='#22c55e'/><circle cx='44' cy='20' r='6' fill='#22c55e'/></svg>",
      "<svg viewBox='0 0 60 40'><circle cx='20' cy='20' r='6' fill='#22c55e'/><circle cx='32' cy='20' r='6' fill='#22c55e'/><circle cx='44' cy='20' r='6' fill='#22c55e'/></svg>",
      "<svg viewBox='0 0 60 40'><rect x='5' y='14' width='12' height='12' fill='#22c55e'/></svg>",
      "<svg viewBox='0 0 60 40'><circle cx='30' cy='20' r='6' fill='#22c55e'/></svg>",
    ],
    correct: 0,
    exp: 'El número de formas aumenta de uno en uno: 1 → 2 → 3 → 4.',
  },
  position: {
    prompt: '¿Qué posición completa el patrón de movimiento?',
    svg: "<svg viewBox='0 0 200 50' xmlns='http://www.w3.org/2000/svg'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='12' cy='25' r='5' fill='#f59e0b'/><g transform='translate(50,0)'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='25' cy='25' r='5' fill='#f59e0b'/></g><g transform='translate(100,0)'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='38' cy='25' r='5' fill='#f59e0b'/></g><text x='155' y='28' fill='#94a3b8'>?</text></svg>",
    options: [
      "<svg viewBox='0 0 50 50'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='12' cy='25' r='5' fill='#f59e0b'/></svg>",
      "<svg viewBox='0 0 50 50'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='25' cy='12' r='5' fill='#f59e0b'/></svg>",
      "<svg viewBox='0 0 50 50'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='25' cy='38' r='5' fill='#f59e0b'/></svg>",
      "<svg viewBox='0 0 50 50'><rect x='5' y='5' width='40' height='40' fill='none' stroke='#64748b'/><circle cx='38' cy='25' r='5' fill='#f59e0b'/></svg>",
    ],
    correct: 0,
    exp: 'El punto se desplaza a la derecha y vuelve al borde izquierdo al llegar al final.',
  },
};

function generate(count: number) {
  const questions = [];
  const ruleKeys = Object.keys(rules) as Rule[];
  for (let i = 0; i < count; i++) {
    const rule = pick(ruleKeys);
    const r = rules[rule];
    questions.push({
      id: randomId('abstract-gen'),
      type: 'abstract',
      difficulty: (Math.floor(Math.random() * 3) + 2) as 2 | 3 | 4,
      category: pick(['Rotación', 'Alternancia de color', 'Conteo de formas', 'Desplazamiento']),
      tags: [rule, 'patrón'],
      prompt: r.prompt,
      promptSvg: r.svg,
      optionSvgs: r.options,
      correctAnswer: r.correct,
      explanation: r.exp,
    });
  }
  return questions;
}

const count = Number(process.argv[2]) || 5;
writeQuestions('abstract.generated.json', generate(count));
