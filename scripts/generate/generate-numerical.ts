import { pick, randomId, writeQuestions } from './utils';

function pctIncrease(from: number, to: number) {
  return Math.round(((to - from) / from) * 100);
}

function generate(count: number) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const base = Math.floor(Math.random() * 20 + 10) * 100;
    const next = Math.round(base * (1 + (Math.random() * 0.3 + 0.1)));
    const correctPct = pctIncrease(base, next);
    const options = [correctPct - 5, correctPct, correctPct + 5, correctPct + 10]
      .map((v) => `${v}%`)
      .filter((v, idx, arr) => arr.indexOf(v) === idx);
    while (options.length < 4) options.push(`${correctPct + options.length * 3}%`);
    const correctIndex = options.indexOf(`${correctPct}%`);

    questions.push({
      id: randomId('numerical-gen'),
      type: 'numerical',
      difficulty: (Math.floor(Math.random() * 3) + 2) as 2 | 3 | 4,
      category: pick([
        'Análisis presupuestario',
        'Métricas de incidentes',
        'Costes cloud',
        'Asignación de personal',
      ]),
      tags: pick([['porcentaje'], ['ratio'], ['media'], ['diferencia']]),
      dataTable: {
        headers: ['Año', 'Valor (€)'],
        rows: [
          ['2023', String(base)],
          ['2024', String(next)],
        ],
      },
      question: '¿Cuál fue el incremento porcentual de 2023 a 2024?',
      options: options.slice(0, 4),
      correctAnswer: correctIndex >= 0 ? correctIndex : 1,
      explanation: `Incremento = ${next - base}. Porcentaje = (${next - base} / ${base}) × 100 = ${correctPct}%.`,
    });
  }
  return questions;
}

const count = Number(process.argv[2]) || 5;
writeQuestions('numerical.generated.json', generate(count));
