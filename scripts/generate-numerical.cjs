/*
 * Generador de preguntas numéricas estilo CAST (tabla de datos + 5 opciones).
 * Todas las respuestas se calculan programáticamente, por lo que son exactas.
 * Uso: node scripts/generate-numerical.cjs
 */
const fs = require('fs');
const path = require('path');

// RNG con semilla para reproducibilidad
let seed = 20260702;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function randInt(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAISES = ['Bélgica', 'Dinamarca', 'Irlanda', 'Grecia', 'Croacia', 'Letonia', 'Eslovenia', 'Portugal', 'Finlandia', 'Austria', 'Estonia', 'Lituania', 'Malta', 'Chipre', 'Luxemburgo'];
const CIUDADES = ['Amberes', 'Oporto', 'Cracovia', 'Burdeos', 'Tesalónica', 'Gotemburgo', 'Bolonia', 'Valencia', 'Núremberg', 'Brno'];

function fmt(n, dec = 0) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// Construye la pregunta final barajando opciones (todas numéricas formateadas como texto)
function build(id, difficulty, category, tags, dataTable, question, correctValue, distractors, unit, explanation, dec = 0) {
  const values = [correctValue, ...distractors];
  const texts = values.map((v) => `${fmt(v, dec)}${unit}`);
  if (new Set(texts).size !== texts.length) return null; // opciones duplicadas -> descartar
  const opts = shuffle(texts);
  const correctText = texts[0];
  return {
    id,
    type: 'numerical',
    difficulty,
    category,
    tags: ['CAST', 'generado', ...tags],
    dataTable,
    question,
    options: opts,
    correctAnswer: opts.indexOf(correctText),
    explanation,
  };
}

const generators = [];

// 1. Variación porcentual entre dos años
generators.push(function pctChange(id) {
  const temas = [
    ['Turismo', 'pernoctaciones (miles)', 'las pernoctaciones'],
    ['Producción industrial', 'unidades producidas (miles)', 'la producción'],
    ['Comercio exterior', 'exportaciones (millones EUR)', 'las exportaciones'],
    ['Energía', 'consumo eléctrico (GWh)', 'el consumo eléctrico'],
    ['Transporte', 'pasajeros (miles)', 'el número de pasajeros'],
  ];
  const [cat, colName, sujeto] = pick(temas);
  const lugar = pick(PAISES);
  const y1 = randInt(2019, 2023);
  const base = randInt(40, 900) * 10;
  const pct = pick([-25, -20, -15, -12, -10, -5, 5, 8, 10, 12, 15, 20, 25, 30, 40]);
  const v2 = Math.round(base * (1 + pct / 100));
  const table = {
    headers: ['Año', `${lugar}: ${colName}`],
    rows: [
      [String(y1), fmt(base)],
      [String(y1 + 1), fmt(v2)],
    ],
  };
  const q = `¿En qué porcentaje ${pct >= 0 ? 'aumentaron' : 'disminuyeron'} ${sujeto} en ${lugar} entre ${y1} y ${y1 + 1}?`;
  const correct = Math.abs(pct);
  const dist = shuffle([correct + 5, correct + 2, Math.max(1, correct - 3), correct + 8, Math.max(1, correct - 5), correct * 2].filter((d) => d !== correct)).slice(0, 4);
  return build(id, pick([2, 3, 3]), cat, ['porcentaje', 'variación'], table, q, correct, dist, ' %', `La variación es ${fmt(Math.abs(v2 - base))} sobre ${fmt(base)}, es decir, ${correct} %.`);
});

// 2. Porcentaje sobre el total
generators.push(function shareOfTotal(id) {
  const temas = [
    ['Presupuesto', 'Partida', 'Importe (millones EUR)', [['Personal'], ['Infraestructuras'], ['Programas'], ['Administración']]],
    ['Encuestas', 'Medio de transporte', 'Encuestados', [['Coche'], ['Transporte público'], ['Bicicleta'], ['A pie']]],
    ['Educación', 'Nivel de estudios', 'Estudiantes (miles)', [['Primaria'], ['Secundaria'], ['Formación profesional'], ['Universidad']]],
  ];
  const [cat, h1, h2, cats] = pick(temas);
  const parts = cats.map(() => randInt(2, 12) * 5);
  const total = parts.reduce((a, b) => a + b, 0);
  const idx = randInt(0, parts.length - 1);
  const correct = Math.round((parts[idx] / total) * 1000) / 10;
  const table = {
    headers: [h1, h2],
    rows: cats.map((c, i) => [c[0], fmt(parts[i])]),
  };
  const q = `¿Qué porcentaje del total representa la categoría "${cats[idx][0]}"? (Redondea a un decimal.)`;
  const dist = [
    Math.round((parts[(idx + 1) % parts.length] / total) * 1000) / 10,
    Math.round(correct * 10 + 45) / 10,
    Math.max(0.5, Math.round(correct * 10 - 38) / 10),
    Math.round(correct * 10 + 92) / 10,
  ];
  return build(id, pick([2, 3, 4]), cat, ['porcentaje', 'proporción'], table, q, correct, dist, ' %', `El total es ${fmt(total)}; ${fmt(parts[idx])} / ${fmt(total)} = ${fmt(correct, 1)} %.`, 1);
});

// 3. Valor per cápita
generators.push(function perCapita(id) {
  const lugar = pick(CIUDADES);
  const temas = [
    ['Medio ambiente', 'Residuos generados (toneladas)', 'kg de residuos por habitante', 1000],
    ['Consumo', 'Agua consumida (miles de m3)', 'litros de agua por habitante', 1000000 / 1000],
  ];
  const [cat, colName, unidad, factor] = pick(temas);
  const habitantes = randInt(40, 400) * 1000;
  const porHab = randInt(120, 600);
  const totalRecurso = (porHab * habitantes) / factor;
  const table = {
    headers: ['Indicador', lugar],
    rows: [
      ['Habitantes', fmt(habitantes)],
      [colName, fmt(totalRecurso)],
    ],
  };
  const q = `¿Cuántos ${unidad} corresponden de media en ${lugar}?`;
  const correct = porHab;
  const dist = [porHab + randInt(20, 60), Math.max(10, porHab - randInt(20, 60)), porHab * 2, Math.round(porHab / 2)];
  return build(id, pick([3, 4]), cat, ['per cápita', 'división'], table, q, correct, dist, '', `${fmt(totalRecurso)} equivale a ${fmt(porHab * habitantes)} en la unidad pedida; dividido entre ${fmt(habitantes)} habitantes da ${fmt(porHab)}.`);
});

// 4. Media de varios años
generators.push(function averageYears(id) {
  const temas = [
    ['Empleo', 'Nuevos contratos', pick(PAISES)],
    ['Agricultura', 'Cosecha (miles de toneladas)', pick(PAISES)],
    ['Vivienda', 'Viviendas iniciadas', pick(CIUDADES)],
  ];
  const [cat, colName, lugar] = pick(temas);
  const n = pick([3, 4]);
  const y0 = randInt(2018, 2021);
  const media = randInt(30, 300) * 10;
  // generar n valores con esa media exacta
  const vals = [];
  let rem = media * n;
  for (let i = 0; i < n - 1; i++) {
    const v = media + randInt(-8, 8) * 10;
    vals.push(v);
    rem -= v;
  }
  vals.push(rem);
  if (rem <= 0) return null;
  const table = {
    headers: ['Año', `${lugar}: ${colName}`],
    rows: vals.map((v, i) => [String(y0 + i), fmt(v)]),
  };
  const q = `¿Cuál fue la media anual de "${colName}" en ${lugar} durante el periodo ${y0}-${y0 + n - 1}?`;
  const dist = [media + 10, media - 10, media + 25, media + randInt(4, 9) * 10];
  return build(id, pick([2, 3]), cat, ['media', 'promedio'], table, q, media, dist, '', `La suma es ${fmt(media * n)}; dividida entre ${n} años da ${fmt(media)}.`);
});

// 5. Proyección con crecimiento anual constante
generators.push(function projection(id) {
  const temas = [
    ['Tecnología', 'usuarios registrados (miles)'],
    ['Energía', 'potencia solar instalada (MW)'],
    ['Comercio', 'pedidos en línea (miles)'],
  ];
  const [cat, colName] = pick(temas);
  const lugar = pick(PAISES);
  const base = randInt(10, 80) * 10;
  const pct = pick([10, 20, 25, 50]);
  const years = 2;
  const correct = Math.round(base * Math.pow(1 + pct / 100, years));
  const anio = randInt(2024, 2025);
  const table = {
    headers: ['Indicador', 'Valor'],
    rows: [
      [`${colName} en ${anio} (${lugar})`, fmt(base)],
      ['Crecimiento anual previsto', `${pct} %`],
    ],
  };
  const q = `Si el crecimiento anual previsto se mantiene constante, ¿qué valor alcanzará el indicador en ${anio + years}?`;
  const lineal = base + Math.round((base * pct * years) / 100); // error típico: crecimiento lineal
  const dist = [lineal !== correct ? lineal : correct + 7, Math.round(base * (1 + pct / 100)), correct + randInt(15, 40), Math.max(1, correct - randInt(15, 40))];
  return build(id, pick([4, 5]), cat, ['proyección', 'interés compuesto'], table, q, correct, dist, '', `Aplicando ${pct} % dos veces: ${fmt(base)} × ${(1 + pct / 100).toFixed(2)}² = ${fmt(correct)}.`);
});

// 6. Diferencia absoluta entre categorías o años
generators.push(function difference(id) {
  const temas = [
    ['Sanidad', 'Consultas atendidas', pick(CIUDADES)],
    ['Cultura', 'Visitantes del museo', pick(CIUDADES)],
    ['Logística', 'Paquetes entregados (miles)', pick(PAISES)],
  ];
  const [cat, colName, lugar] = pick(temas);
  const y0 = randInt(2019, 2022);
  const n = 4;
  const vals = Array.from({ length: n }, () => randInt(50, 950) * 10);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max === min) return null;
  const correct = max - min;
  const table = {
    headers: ['Año', `${lugar}: ${colName}`],
    rows: vals.map((v, i) => [String(y0 + i), fmt(v)]),
  };
  const q = `¿Cuál es la diferencia entre el año con mayor valor y el año con menor valor de "${colName}" en ${lugar}?`;
  const dist = [correct + 20, Math.max(10, correct - 20), correct + 50, vals[0] > vals[n - 1] ? vals[0] - vals[n - 1] : vals[n - 1] - vals[0]];
  return build(id, 2, cat, ['diferencia', 'lectura de tabla'], table, q, correct, dist.filter((d) => d !== correct).slice(0, 4), '', `El máximo es ${fmt(max)} y el mínimo ${fmt(min)}; la diferencia es ${fmt(correct)}.`);
});

// 7. Coste total con descuento
generators.push(function costDiscount(id) {
  const items = [
    ['licencias de software', 'EUR', randInt(40, 240)],
    ['sillas ergonómicas', 'EUR', randInt(60, 180)],
    ['monitores', 'EUR', randInt(90, 260)],
  ];
  const [item, , unitPrice] = pick(items);
  const qty = pick([10, 20, 25, 40, 50]);
  const pctDto = pick([5, 10, 15, 20]);
  const bruto = unitPrice * qty;
  const correct = Math.round(bruto * (1 - pctDto / 100));
  const table = {
    headers: ['Concepto', 'Valor'],
    rows: [
      [`Precio unitario (${item})`, `${fmt(unitPrice)} EUR`],
      ['Unidades pedidas', fmt(qty)],
      ['Descuento por volumen', `${pctDto} %`],
    ],
  };
  const q = `¿Cuál es el coste total del pedido una vez aplicado el descuento?`;
  const dist = [bruto, Math.round(bruto * (1 + pctDto / 100)), correct + unitPrice, Math.round(bruto * (1 - pctDto / 100 / 2))];
  return build(id, pick([3, 4]), 'Compras', ['descuento', 'porcentaje'], table, q, correct, dist.filter((d) => d !== correct).slice(0, 4), ' EUR', `El bruto es ${fmt(bruto)} EUR; con ${pctDto} % de descuento queda ${fmt(correct)} EUR.`);
});

// 8. Valor original antes de un incremento (porcentaje inverso)
generators.push(function reversePct(id) {
  const temas = [
    ['Precios', 'el precio de un abono anual de transporte'],
    ['Tasas', 'la tasa de inscripción de un congreso'],
    ['Alquiler', 'el alquiler mensual de una oficina'],
  ];
  const [cat, concepto] = pick(temas);
  const pct = pick([10, 20, 25, 50]);
  const original = randInt(12, 90) * 10;
  const actual = Math.round(original * (1 + pct / 100));
  const table = {
    headers: ['Concepto', 'Valor'],
    rows: [
      ['Valor actual', `${fmt(actual)} EUR`],
      ['Incremento aplicado respecto al año anterior', `${pct} %`],
    ],
  };
  const q = `Tras aplicar el incremento indicado, ${concepto} es el valor actual. ¿Cuál era su valor antes del incremento?`;
  const wrong = Math.round(actual * (1 - pct / 100)); // error típico: restar el % al actual
  const dist = [wrong !== original ? wrong : original + 5, original + 10, Math.max(5, original - 10), actual];
  return build(id, pick([4, 5]), cat, ['porcentaje inverso'], table, q, original, dist, ' EUR', `Si x × ${(1 + pct / 100).toFixed(2)} = ${fmt(actual)}, entonces x = ${fmt(original)} EUR. Restar el ${pct} % al valor actual es incorrecto.`);
});

// 9. Ratio / proporción entre dos magnitudes
generators.push(function ratio(id) {
  const lugar = pick(PAISES);
  const cat = 'Recursos humanos';
  const ratioVal = pick([2, 3, 4, 5]);
  const admins = randInt(8, 40) * 5;
  const tecnicos = admins * ratioVal;
  const table = {
    headers: ['Perfil', `Plantilla en ${lugar}`],
    rows: [
      ['Personal técnico', fmt(tecnicos)],
      ['Personal administrativo', fmt(admins)],
    ],
  };
  const q = `¿Cuántos empleados técnicos hay por cada empleado administrativo?`;
  const dist = [ratioVal + 1, Math.max(1, ratioVal - 1), ratioVal + 2, ratioVal * 2];
  return build(id, 2, cat, ['ratio', 'proporción'], table, q, ratioVal, dist, '', `${fmt(tecnicos)} / ${fmt(admins)} = ${ratioVal}.`);
});

// 10. Reparto proporcional
generators.push(function proportionalSplit(id) {
  const cat = 'Presupuesto';
  const unidades = ['Unidad A', 'Unidad B', 'Unidad C'];
  const pesos = [randInt(1, 4), randInt(1, 4), randInt(1, 4)];
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const totalMiles = sumaPesos * randInt(20, 90) * 10;
  const idx = randInt(0, 2);
  const correct = (totalMiles / sumaPesos) * pesos[idx];
  const table = {
    headers: ['Unidad', 'Personal asignado'],
    rows: unidades.map((u, i) => [u, fmt(pesos[i] * 10)]),
  };
  const q = `Un presupuesto de ${fmt(totalMiles)} EUR se reparte entre las tres unidades de forma proporcional a su personal. ¿Cuánto recibe la ${unidades[idx]}?`;
  const otherIdx = (idx + 1) % 3;
  const dist = [
    (totalMiles / sumaPesos) * pesos[otherIdx],
    Math.round(totalMiles / 3),
    correct + totalMiles / sumaPesos / 2,
    Math.max(10, correct - totalMiles / sumaPesos / 2),
  ].map(Math.round);
  return build(id, pick([3, 4]), cat, ['reparto proporcional'], table, q, Math.round(correct), dist.filter((d) => d !== Math.round(correct)).slice(0, 4), ' EUR', `El total de personal es ${fmt(sumaPesos * 10)}; la ${unidades[idx]} representa ${pesos[idx] * 10}/${sumaPesos * 10} del total, es decir, ${fmt(Math.round(correct))} EUR.`);
});

// 11. Velocidad / tiempo / distancia
generators.push(function speedTime(id) {
  const cat = 'Transporte';
  const speed = pick([60, 80, 90, 100, 120]);
  const hours = pick([1.5, 2, 2.5, 3, 4]);
  const dist1 = speed * hours;
  const table = {
    headers: ['Tramo', 'Datos'],
    rows: [
      ['Velocidad media', `${speed} km/h`],
      ['Duración del trayecto', `${fmt(hours, 1)} horas`],
    ],
  };
  const q = `Un tren mantiene la velocidad media indicada durante todo el trayecto. ¿Qué distancia recorre?`;
  const distractors = [dist1 + speed / 2, dist1 - speed / 2, dist1 + speed, speed * (hours + 1)];
  return build(id, 2, cat, ['velocidad', 'distancia'], table, q, dist1, distractors, ' km', `Distancia = velocidad × tiempo = ${speed} × ${fmt(hours, 1)} = ${fmt(dist1)} km.`);
});

// 12. Tasa por mil / incidencia
generators.push(function ratePerThousand(id) {
  const cat = 'Estadística social';
  const lugar = pick(CIUDADES);
  const rate = randInt(4, 60);
  const pobMiles = randInt(50, 800);
  const casos = rate * pobMiles;
  const table = {
    headers: ['Indicador', lugar],
    rows: [
      ['Población', fmt(pobMiles * 1000)],
      ['Casos registrados', fmt(casos)],
    ],
  };
  const q = `¿Cuántos casos registrados hay por cada 1.000 habitantes en ${lugar}?`;
  const dist = [rate + randInt(2, 8), Math.max(1, rate - randInt(2, 8)), rate * 10, Math.max(1, Math.round(rate / 2))];
  return build(id, pick([3, 4]), cat, ['tasa', 'incidencia'], table, q, rate, dist, '', `${fmt(casos)} / ${fmt(pobMiles * 1000)} × 1.000 = ${rate} casos por mil habitantes.`);
});

// 13. Consumo medio y coste combinado
generators.push(function combinedCost(id) {
  const cat = 'Costes operativos';
  const kwhPrice = pick([0.12, 0.15, 0.2, 0.25]);
  const consumo = randInt(20, 90) * 100;
  const fijo = pick([40, 60, 80, 100]);
  const meses = pick([1, 3, 6]);
  const correct = Math.round((consumo * kwhPrice + fijo) * meses);
  const table = {
    headers: ['Concepto', 'Valor'],
    rows: [
      ['Consumo eléctrico mensual', `${fmt(consumo)} kWh`],
      ['Precio por kWh', `${fmt(kwhPrice, 2)} EUR`],
      ['Cuota fija mensual', `${fmt(fijo)} EUR`],
    ],
  };
  const q = meses === 1 ? '¿Cuál es el coste eléctrico total de un mes?' : `¿Cuál es el coste eléctrico total de ${meses} meses?`;
  const sinFijo = Math.round(consumo * kwhPrice * meses);
  const dist = [sinFijo !== correct ? sinFijo : correct + 11, correct + fijo, correct - Math.round(fijo / 2), Math.round(correct * 1.15)];
  return build(id, pick([3, 4]), cat, ['coste', 'multiplicación'], table, q, correct, dist, ' EUR', `Cada mes cuesta ${fmt(consumo)} × ${fmt(kwhPrice, 2)} + ${fmt(fijo)} = ${fmt(consumo * kwhPrice + fijo)} EUR; por ${meses} mes(es), ${fmt(correct)} EUR.`);
});

// --- Generación principal ---
const TARGET = 155;
const questions = [];
const seenKeys = new Set();
let counter = 1;
let attempts = 0;
while (questions.length < TARGET && attempts < 5000) {
  attempts++;
  const gen = generators[attempts % generators.length];
  const id = `numerical-exp-${String(counter).padStart(3, '0')}`;
  const q = gen(id);
  if (!q) continue;
  const key = q.question + '|' + JSON.stringify(q.dataTable);
  if (seenKeys.has(key)) continue;
  // Validaciones
  if (q.options.length !== 5) continue;
  if (new Set(q.options).size !== 5) continue;
  if (q.correctAnswer < 0 || q.correctAnswer > 4) continue;
  seenKeys.add(key);
  questions.push(q);
  counter++;
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'questions', 'numerical.expansion.generated.json');
fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf8');
console.log(`Generadas ${questions.length} preguntas numéricas en ${outPath} (intentos: ${attempts})`);
