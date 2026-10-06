import { writeQuestions } from './utils';

type Difficulty = 1 | 2 | 3 | 4 | 5;

type VerbalQuestion = {
  id: string;
  type: 'verbal';
  difficulty: Difficulty;
  category: string;
  tags: string[];
  passage: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type NumericalQuestion = {
  id: string;
  type: 'numerical';
  difficulty: Difficulty;
  category: string;
  tags: string[];
  dataTable: { headers: string[]; rows: string[][] };
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type TechnicalQuestion = {
  id: string;
  type: 'technical';
  difficulty: Difficulty;
  category: string;
  tags: string[];
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type OptionSet = {
  options: string[];
  correctAnswer: number;
};

const VERBAL_DEFAULT_QUESTION = '¿Cuál de las siguientes afirmaciones se deduce del texto?';

function difficulty(seed: number): Difficulty {
  return ((seed % 5) + 1) as Difficulty;
}

function rotateOptions(correct: string, distractors: string[], seed: number): OptionSet {
  const unique = [correct, ...distractors].filter(
    (option, index, arr) => arr.indexOf(option) === index,
  );
  while (unique.length < 4) unique.push(`Ninguna de las anteriores (${unique.length})`);

  const base = unique.slice(0, 4);
  const shift = seed % base.length;
  const options = base.map((_, index) => base[(index - shift + base.length) % base.length]);

  return {
    options,
    correctAnswer: options.indexOf(correct),
  };
}

function numberFormat(value: number, decimals = 0): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function sentenceStart(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function money(value: number): string {
  return `${numberFormat(value)} €`;
}

function percent(value: number, decimals = 0): string {
  return `${numberFormat(value, decimals)} %`;
}

const verbalThemes = [
  {
    category: 'Protección de datos',
    unit: 'la oficina de protección de datos',
    subject: 'la evaluación previa de tratamientos con datos personales',
    measure:
      'Las evaluaciones completas solo se exigen antes de poner en producción tratamientos que puedan implicar un riesgo alto',
    condition:
      'las pruebas internas con datos ficticios quedan fuera de ese requisito, aunque deben documentarse',
    caveat:
      'el responsable del tratamiento conserva la obligación de consultar a la oficina si el alcance cambia durante el proyecto',
    correct:
      'No todas las pruebas internas requieren una evaluación completa, pero los cambios de alcance deben consultarse.',
    distractors: [
      'Todas las pruebas internas requieren siempre una evaluación completa antes de empezar.',
      'El texto indica que los datos ficticios están prohibidos en proyectos piloto.',
      'El responsable queda exento de consultar a la oficina si el proyecto ya ha empezado.',
    ],
  },
  {
    category: 'Traducción institucional',
    unit: 'la unidad de traducción',
    subject: 'la priorización de solicitudes multilingües',
    measure:
      'Las solicitudes con plazo jurídico obligatorio se atienden antes que los textos divulgativos',
    condition:
      'los documentos divulgativos pueden adelantarse si ya existe una memoria de traducción reutilizable',
    caveat:
      'el orden de llegada solo se aplica cuando dos solicitudes tienen la misma prioridad operativa',
    correct:
      'El orden de llegada no es el criterio principal cuando existen plazos jurídicos u otras prioridades.',
    distractors: [
      'Los textos divulgativos siempre se traducen antes que los documentos jurídicos.',
      'La unidad atiende todas las solicitudes estrictamente por orden de llegada.',
      'Las memorias de traducción no influyen en la planificación del trabajo.',
    ],
  },
  {
    category: 'Contratación pública',
    unit: 'el comité de evaluación',
    subject: 'la revisión de ofertas en una licitación de servicios',
    measure:
      'Primero se comprueban los criterios de exclusión y selección, y después se puntúa la oferta técnica',
    condition: 'la oferta económica solo se abre si la propuesta técnica supera el umbral mínimo',
    caveat: 'una oferta barata puede ser rechazada si no acredita la capacidad técnica exigida',
    correct:
      'El precio no basta para adjudicar si la oferta no supera los requisitos técnicos y de selección.',
    distractors: [
      'La oferta económica se abre siempre antes de comprobar los requisitos de selección.',
      'La propuesta más barata debe adjudicarse aunque no cumpla el umbral técnico.',
      'El comité omite los criterios de exclusión cuando hay suficiente competencia.',
    ],
  },
  {
    category: 'Recursos humanos',
    unit: 'la dirección de recursos humanos',
    subject: 'el teletrabajo en periodos de alta demanda',
    measure:
      'Se permiten hasta dos días semanales de teletrabajo cuando la cobertura del servicio queda garantizada',
    condition:
      'los responsables pueden limitarlo durante reuniones presenciales críticas o tareas con documentación sensible',
    caveat:
      'la autorización concedida para una semana no crea un derecho automático para semanas posteriores',
    correct:
      'El teletrabajo está condicionado por las necesidades del servicio y puede limitarse en semanas concretas.',
    distractors: [
      'La autorización semanal concede un derecho permanente a teletrabajar dos días.',
      'Los responsables no pueden limitar el teletrabajo por reuniones críticas.',
      'El texto prohíbe el teletrabajo siempre que exista documentación sensible en la unidad.',
    ],
  },
  {
    category: 'Ciberseguridad',
    unit: 'el equipo de sensibilización en ciberseguridad',
    subject: 'las simulaciones de phishing y la formación asociada',
    measure:
      'Las campañas de simulación se realizan trimestralmente y no se usan para sanciones disciplinarias automáticas',
    condition:
      'quienes gestionan cuentas privilegiadas deben completar formación adicional si fallan dos simulaciones consecutivas',
    caveat:
      'los resultados se comunican a los responsables de servicio de forma agregada salvo en casos de riesgo crítico',
    correct:
      'La formación adicional se activa para cuentas privilegiadas tras dos fallos consecutivos, no tras cualquier error aislado.',
    distractors: [
      'Cualquier fallo en una simulación implica una sanción disciplinaria automática.',
      'Los resultados individuales se comunican siempre a toda la organización.',
      'Las campañas se ejecutan solo una vez cada dos años.',
    ],
  },
  {
    category: 'Seguridad física',
    unit: 'la oficina de acreditaciones',
    subject: 'la gestión de tarjetas de acceso a edificios',
    measure: 'Las tarjetas sin uso durante más de treinta días se suspenden de forma preventiva',
    condition:
      'la suspensión no se aplica a personal con misión registrada o permiso parental comunicado',
    caveat:
      'la reactivación exige confirmación del responsable jerárquico y verificación de identidad',
    correct:
      'Una tarjeta inactiva puede suspenderse, salvo excepciones registradas, y su reactivación requiere verificación.',
    distractors: [
      'Toda tarjeta sin uso se elimina definitivamente sin posibilidad de reactivación.',
      'Las misiones registradas no tienen ningún efecto sobre la suspensión preventiva.',
      'La tarjeta se reactiva automáticamente al primer intento de entrada.',
    ],
  },
  {
    category: 'Gestión documental',
    unit: 'el archivo central',
    subject: 'la conservación de expedientes contractuales',
    measure:
      'Los contratos firmados se conservan durante diez años desde el cierre financiero del expediente',
    condition:
      'los borradores sin valor decisorio se eliminan a los dos años si no existe litigio ni auditoría abierta',
    caveat: 'una retención por litigio prevalece sobre el calendario ordinario de eliminación',
    correct:
      'Los borradores pueden eliminarse antes que los contratos firmados, salvo si existe litigio o auditoría.',
    distractors: [
      'Todos los borradores se conservan durante diez años aunque no tengan valor decisorio.',
      'La retención por litigio no modifica el calendario de eliminación documental.',
      'Los contratos firmados se eliminan a los dos años del cierre financiero.',
    ],
  },
  {
    category: 'Accesibilidad digital',
    unit: 'el equipo web',
    subject: 'la publicación de documentos accesibles',
    measure: 'El contenido nuevo debe cumplir los requisitos de accesibilidad antes de publicarse',
    condition:
      'los PDF antiguos se corrigen prioritariamente cuando reciben muchas consultas o cuando una persona solicita una versión accesible',
    caveat: 'la falta de una petición concreta no justifica publicar nuevo contenido inaccesible',
    correct:
      'Los documentos nuevos deben ser accesibles, y los antiguos se corrigen con prioridad según uso o solicitud.',
    distractors: [
      'El equipo solo adapta documentos si existe una reclamación formal previa.',
      'Los PDF antiguos nunca pueden corregirse después de publicados.',
      'La accesibilidad se exige únicamente a páginas HTML, no a documentos publicados.',
    ],
  },
  {
    category: 'Gestión de incidentes',
    unit: 'el centro de respuesta a incidentes',
    subject: 'la notificación interna de posibles brechas de datos',
    measure: 'Las sospechas de brecha se notifican internamente en las primeras veinticuatro horas',
    condition:
      'la decisión de notificar a la autoridad corresponde al responsable competente tras valorar el riesgo',
    caveat:
      'la notificación interna temprana no implica reconocer de inmediato que la brecha esté confirmada',
    correct:
      'Una sospecha debe escalarse pronto internamente, aunque la confirmación y la notificación externa requieran valoración.',
    distractors: [
      'Solo se informa internamente cuando la brecha ya está confirmada judicialmente.',
      'Toda sospecha obliga automáticamente a notificar a la autoridad sin valorar el riesgo.',
      'La notificación interna equivale a admitir que la brecha está plenamente confirmada.',
    ],
  },
  {
    category: 'Servicios cloud',
    unit: 'el programa de migración a la nube',
    subject: 'la selección de sistemas para una primera oleada',
    measure:
      'La primera oleada incluye archivos no sensibles y aplicaciones con dependencias técnicas simples',
    condition:
      'los sistemas con información clasificada permanecen fuera hasta completar la acreditación de seguridad',
    caveat:
      'la decisión de migrar considera tanto el riesgo de la información como la complejidad de integración',
    correct:
      'La primera migración prioriza sistemas de menor riesgo y complejidad; los clasificados esperan acreditación.',
    distractors: [
      'Los sistemas con información clasificada se migran primero para acelerar el calendario.',
      'La complejidad de integración no influye en la selección de sistemas.',
      'La primera oleada incluye cualquier archivo, con independencia de su sensibilidad.',
    ],
  },
  {
    category: 'Organización de eventos',
    unit: 'la secretaría de conferencias',
    subject: 'la reserva de interpretación para reuniones híbridas',
    measure:
      'La interpretación se confirma cuando al menos doce participantes solicitan una lengua antes del plazo interno',
    condition: 'las solicitudes tardías se aceptan solo si hay cabinas y personal disponibles',
    caveat: 'la inscripción en la reunión no equivale por sí sola a solicitar interpretación',
    correct:
      'La interpretación depende de solicitudes lingüísticas suficientes y dentro de plazo, no solo de la inscripción general.',
    distractors: [
      'Toda persona inscrita genera automáticamente una cabina de interpretación.',
      'Las solicitudes tardías se aceptan siempre aunque no haya personal disponible.',
      'La secretaría confirma interpretación con una sola solicitud recibida.',
    ],
  },
  {
    category: 'Formación',
    unit: 'el comité de aprendizaje',
    subject: 'la asignación del presupuesto anual de formación',
    measure:
      'La ciberseguridad y la contratación pública tienen prioridad por obligaciones regulatorias recientes',
    condition:
      'los cursos de idiomas se financian con el presupuesto restante cuando están vinculados al puesto',
    caveat:
      'las solicitudes aprobadas pueden posponerse si coinciden con periodos críticos de servicio',
    correct:
      'Los idiomas pueden financiarse, pero después de prioridades obligatorias y si guardan relación con el puesto.',
    distractors: [
      'Los cursos de idiomas tienen siempre prioridad sobre la formación obligatoria.',
      'El comité no puede posponer ninguna solicitud ya aprobada.',
      'La vinculación con el puesto no influye en la financiación de idiomas.',
    ],
  },
  {
    category: 'Sostenibilidad',
    unit: 'la oficina de movilidad sostenible',
    subject: 'los desplazamientos profesionales de corta distancia',
    measure:
      'Para trayectos inferiores a seiscientos kilómetros se recomienda el tren cuando el horario permite llegar el mismo día',
    condition:
      'el avión puede autorizarse si la combinación ferroviaria impide asistir a una reunión esencial',
    caveat:
      'la recomendación ambiental no elimina la obligación de justificar el coste y el tiempo de viaje',
    correct:
      'El tren es preferente en trayectos cortos, pero puede autorizarse el avión si el horario ferroviario no permite asistir.',
    distractors: [
      'El avión está prohibido en todos los trayectos inferiores a seiscientos kilómetros.',
      'La recomendación ambiental elimina cualquier control de coste del viaje.',
      'El tren solo se recomienda si el viaje supera seiscientos kilómetros.',
    ],
  },
  {
    category: 'Soporte informático',
    unit: 'el servicio de asistencia informática',
    subject: 'los niveles de servicio para incidencias de usuario',
    measure:
      'Las interrupciones que afectan a más de cincuenta usuarios tienen objetivo de resolución de cuatro horas',
    condition:
      'las incidencias individuales sin impacto crítico se planifican en un plazo de dos días laborables',
    caveat:
      'la prioridad se revisa si una incidencia inicialmente individual revela un fallo generalizado',
    correct:
      'La prioridad depende del impacto, y una incidencia puede reclasificarse si se descubre un alcance mayor.',
    distractors: [
      'Todas las incidencias individuales tienen objetivo de resolución de cuatro horas.',
      'Una incidencia nunca puede cambiar de prioridad después de registrarse.',
      'El número de usuarios afectados no influye en el nivel de servicio.',
    ],
  },
  {
    category: 'Datos abiertos',
    unit: 'el equipo de datos abiertos',
    subject: 'la publicación de conjuntos de datos administrativos',
    measure:
      'Los conjuntos pueden publicarse tras anonimización y aprobación del propietario de la información',
    condition:
      'los ficheros brutos con datos personales quedan excluidos de la publicación abierta',
    caveat:
      'la publicación se acompaña de metadatos que explican alcance, fecha y limitaciones de uso',
    correct:
      'La publicación abierta requiere anonimización, aprobación y metadatos; los ficheros brutos personales quedan excluidos.',
    distractors: [
      'Los ficheros brutos con datos personales se publican si tienen interés estadístico.',
      'Los metadatos se omiten para evitar explicar limitaciones del conjunto.',
      'La aprobación del propietario de la información no es necesaria para publicar datos.',
    ],
  },
  {
    category: 'Clasificación documental',
    unit: 'la autoridad de seguridad',
    subject: 'la revisión de marcas de protección en documentos internos',
    measure: 'Las marcas de protección se revisan anualmente para comprobar si siguen justificadas',
    condition:
      'la retirada de una marca exige confirmar que el perjuicio potencial ha desaparecido o se ha reducido',
    caveat:
      'el paso del tiempo por sí solo no convierte automáticamente un documento protegido en público',
    correct:
      'La revisión anual puede retirar marcas, pero solo si el riesgo que las justificaba ha cambiado.',
    distractors: [
      'Todo documento protegido pasa a ser público automáticamente al cabo de un año.',
      'Las marcas de protección no se revisan una vez aplicadas.',
      'La retirada de una marca no requiere analizar el perjuicio potencial.',
    ],
  },
  {
    category: 'Control de accesos',
    unit: 'la unidad de seguridad de sedes',
    subject: 'el acceso de visitantes a zonas restringidas',
    measure:
      'Los visitantes deben estar acompañados en zonas restringidas salvo que cuenten con autorización previa específica',
    condition:
      'la autorización previa se concede para una finalidad y una franja horaria determinadas',
    caveat: 'registrarse en recepción no habilita el acceso autónomo a todas las plantas',
    correct:
      'El registro en recepción no basta para moverse sin acompañamiento por zonas restringidas.',
    distractors: [
      'Cualquier visitante registrado puede circular libremente por todas las plantas.',
      'La autorización previa se concede sin límite de finalidad ni horario.',
      'Los visitantes nunca pueden acceder a zonas restringidas aunque estén autorizados.',
    ],
  },
  {
    category: 'Gestión de parches',
    unit: 'el equipo de administración de sistemas',
    subject: 'la instalación de actualizaciones de seguridad',
    measure:
      'Los parches críticos en servicios expuestos a internet se aplican en un plazo máximo de siete días',
    condition:
      'los sistemas internos no críticos se actualizan en la ventana mensual salvo riesgo excepcional',
    caveat: 'las excepciones deben documentarse con una medida temporal de mitigación',
    correct:
      'Los servicios expuestos con parches críticos tienen prioridad, y las excepciones requieren mitigación documentada.',
    distractors: [
      'Todos los sistemas se actualizan solo una vez al año, aunque estén expuestos a internet.',
      'Las excepciones no necesitan justificación ni medidas temporales.',
      'Los sistemas internos no críticos siempre tienen prioridad sobre los servicios expuestos.',
    ],
  },
  {
    category: 'Encuestas internas',
    unit: 'la oficina de análisis organizativo',
    subject: 'la publicación de resultados de una encuesta de personal',
    measure:
      'Los resultados se publican por unidad solo cuando hay al menos diez respuestas válidas',
    condition: 'si el umbral no se alcanza, los datos se agregan a un nivel organizativo superior',
    caveat:
      'los comentarios libres se revisan para retirar referencias que identifiquen indirectamente a personas',
    correct:
      'Las unidades con pocas respuestas no se publican de forma separada para reducir el riesgo de identificación.',
    distractors: [
      'Los resultados se publican por unidad aunque solo responda una persona.',
      'Los comentarios libres se publican íntegros sin revisar referencias identificables.',
      'Si no se alcanza el umbral, los datos se eliminan y no pueden agregarse.',
    ],
  },
  {
    category: 'Subvenciones',
    unit: 'la unidad de subvenciones',
    subject: 'la subsanación de solicitudes incompletas',
    measure:
      'Las entidades pueden aportar documentos administrativos omitidos dentro de los cinco días hábiles siguientes',
    condition: 'no se permite modificar los criterios técnicos que se evalúan con puntuación',
    caveat:
      'la subsanación busca corregir defectos formales, no mejorar la propuesta después del cierre',
    correct:
      'La subsanación permite corregir documentos administrativos, pero no mejorar elementos técnicos puntuables.',
    distractors: [
      'Las entidades pueden reescribir la propuesta técnica después del cierre.',
      'Los documentos administrativos omitidos nunca pueden aportarse posteriormente.',
      'La subsanación se usa para conceder puntuación adicional a todas las solicitudes.',
    ],
  },
  {
    category: 'Auditoría',
    unit: 'la función de auditoría interna',
    subject: 'el seguimiento de recomendaciones de alto riesgo',
    measure: 'Las recomendaciones de alto riesgo requieren un plan de acción en treinta días',
    condition:
      'la recomendación no se cierra hasta que se aporta evidencia verificable de la medida implantada',
    caveat: 'la aceptación de la recomendación por la dirección no equivale a su cierre',
    correct:
      'Aceptar una recomendación no la cierra; hace falta evidencia de que la medida se ha implantado.',
    distractors: [
      'Las recomendaciones de alto riesgo se cierran automáticamente cuando la dirección las acepta.',
      'El plan de acción puede presentarse sin plazo definido.',
      'La auditoría no exige evidencias para cerrar recomendaciones.',
    ],
  },
  {
    category: 'Gestión de riesgos',
    unit: 'el comité de riesgos operativos',
    subject: 'la actualización del registro de riesgos',
    measure: 'Cada propietario revisa sus riesgos al menos trimestralmente',
    condition:
      'los cambios relevantes en impacto o probabilidad se comunican fuera del ciclo ordinario',
    caveat: 'la revisión anual del comité no sustituye las actualizaciones de los propietarios',
    correct:
      'Los propietarios actualizan riesgos trimestralmente y también cuando hay cambios relevantes.',
    distractors: [
      'Los propietarios solo actualizan riesgos una vez al año durante el comité.',
      'Los cambios de probabilidad nunca se comunican fuera del ciclo ordinario.',
      'La revisión anual sustituye cualquier seguimiento trimestral.',
    ],
  },
  {
    category: 'Gestión documental',
    unit: 'la unidad de correspondencia',
    subject: 'el uso de buzones compartidos para expedientes',
    measure: 'Los mensajes vinculados a un expediente se archivan cuando el caso queda cerrado',
    condition:
      'las opiniones personales sin relevancia decisoria no se incorporan al registro oficial',
    caveat:
      'la respuesta final sí debe conservarse junto con los documentos que justifican la decisión',
    correct:
      'El expediente conserva la respuesta final y sus justificantes, no todas las opiniones personales intercambiadas.',
    distractors: [
      'Toda opinión personal del buzón compartido debe incorporarse al registro oficial.',
      'La respuesta final se elimina al cerrar el caso.',
      'Los mensajes vinculados a expedientes nunca se archivan.',
    ],
  },
  {
    category: 'Gestión contractual',
    unit: 'la unidad de contratos',
    subject: 'la renovación de contratos de apoyo externo',
    measure:
      'La renovación depende de la evaluación del rendimiento y de la disponibilidad presupuestaria',
    condition:
      'el proveedor debe mantener las certificaciones exigidas durante todo el periodo contractual',
    caveat: 'la existencia de una cláusula de renovación no obliga a activarla automáticamente',
    correct:
      'La cláusula permite renovar, pero la renovación no es automática y depende de rendimiento, presupuesto y requisitos.',
    distractors: [
      'Toda cláusula de renovación debe activarse automáticamente al finalizar el contrato.',
      'La disponibilidad presupuestaria no influye en la decisión de renovar.',
      'Las certificaciones solo importan el día de la firma inicial.',
    ],
  },
  {
    category: 'Equipamiento',
    unit: 'el servicio de logística informática',
    subject: 'la sustitución de portátiles del personal',
    measure:
      'Los portátiles se sustituyen tras cuatro años de uso cuando el coste de reparación supera el umbral fijado',
    condition:
      'un equipo más antiguo puede mantenerse si funciona correctamente y recibe actualizaciones de seguridad',
    caveat:
      'la antigüedad por sí sola no justifica una sustitución urgente si no hay riesgo operativo',
    correct:
      'La sustitución considera antigüedad, coste de reparación y seguridad; no depende solo de los años de uso.',
    distractors: [
      'Todo portátil de más de cuatro años se sustituye urgentemente aunque funcione y sea seguro.',
      'Los costes de reparación no se tienen en cuenta en la política.',
      'Un portátil sin actualizaciones de seguridad puede mantenerse sin análisis adicional.',
    ],
  },
];

function generateVerbal(): VerbalQuestion[] {
  const periods = [
    'primer trimestre de 2026',
    'segundo trimestre de 2026',
    'tercer trimestre de 2026',
    'cuarto trimestre de 2026',
  ];

  return Array.from({ length: 100 }, (_, index) => {
    const theme = verbalThemes[index % verbalThemes.length];
    const cycle = Math.floor(index / verbalThemes.length);
    const period = periods[cycle];
    const reviewed = 18 + index * 3;
    const exceptions = 2 + ((index + cycle) % 7);
    const optionSet = rotateOptions(theme.correct, theme.distractors, index);

    return {
      id: `verbal-cast-${String(index + 1).padStart(3, '0')}`,
      type: 'verbal',
      difficulty: difficulty(index + 1),
      category: theme.category,
      tags: ['CAST', 'razonamiento verbal', 'instituciones europeas'],
      passage: `Durante el ${period}, ${theme.unit} actualizó el procedimiento sobre ${theme.subject}. ${theme.measure}. El informe revisó ${reviewed} expedientes y detectó ${exceptions} excepciones menores. Además, señala que ${theme.condition}. ${sentenceStart(theme.caveat)}.`,
      question: VERBAL_DEFAULT_QUESTION,
      options: optionSet.options,
      correctAnswer: optionSet.correctAnswer,
      explanation: `La opción correcta recoge la limitación expresamente indicada: ${theme.correct}`,
    };
  });
}

function makeOptionSet(correct: string, alternatives: string[], seed: number): OptionSet {
  return rotateOptions(correct, alternatives, seed);
}

function makeNumericalQuestion(
  index: number,
  category: string,
  tags: string[],
  dataTable: { headers: string[]; rows: string[][] },
  question: string,
  correct: string,
  alternatives: string[],
  explanation: string,
): NumericalQuestion {
  const optionSet = makeOptionSet(correct, alternatives, index);

  return {
    id: `numerical-cast-${String(index + 1).padStart(3, '0')}`,
    type: 'numerical',
    difficulty: difficulty(index + 2),
    category,
    tags: ['CAST', ...tags],
    dataTable,
    question,
    options: optionSet.options,
    correctAnswer: optionSet.correctAnswer,
    explanation,
  };
}

const numericalMakers: Array<(variant: number, index: number) => NumericalQuestion> = [
  (variant, index) => {
    const base = 1000 + variant * 100;
    const pct = 8 + variant * 2;
    const next = (base * (100 + pct)) / 100;
    return makeNumericalQuestion(
      index,
      'Análisis presupuestario',
      ['porcentaje', 'incremento'],
      {
        headers: ['Año', 'Gasto en formación'],
        rows: [
          ['2024', money(base)],
          ['2025', money(next)],
        ],
      },
      '¿Cuál fue el incremento porcentual del gasto en formación entre 2024 y 2025?',
      percent(pct),
      [percent(pct - 3), percent(pct + 3), percent(pct + 6)],
      `El incremento es ${money(next - base)}. Dividido entre ${money(base)} equivale a ${percent(pct)}.`,
    );
  },
  (variant, index) => {
    const unitA = 12 + variant;
    const unitB = 18 + variant;
    const scoreA = 70 + variant;
    const scoreB = 82 + variant;
    const average = (unitA * scoreA + unitB * scoreB) / (unitA + unitB);
    return makeNumericalQuestion(
      index,
      'Indicadores de servicio',
      ['media ponderada'],
      {
        headers: ['Equipo', 'Casos cerrados', 'Satisfacción media'],
        rows: [
          ['A', String(unitA), String(scoreA)],
          ['B', String(unitB), String(scoreB)],
        ],
      },
      '¿Cuál es la satisfacción media ponderada de los dos equipos?',
      numberFormat(average, 1),
      [
        numberFormat((scoreA + scoreB) / 2, 1),
        numberFormat(average + 1.5, 1),
        numberFormat(average - 2, 1),
      ],
      `Media ponderada = (${unitA} × ${scoreA} + ${unitB} × ${scoreB}) / ${unitA + unitB} = ${numberFormat(average, 1)}.`,
    );
  },
  (variant, index) => {
    const values = [120 + variant * 8, 95 + variant * 9, 140 + variant * 6, 110 + variant * 7];
    const staff = [10 + variant, 8 + variant, 14 + variant, 9 + variant];
    const ratios = values.map((value, idx) => value / staff[idx]);
    const labels = ['Alfa', 'Beta', 'Gamma', 'Delta'];
    const bestIndex = ratios.indexOf(Math.max(...ratios));
    return makeNumericalQuestion(
      index,
      'Productividad',
      ['ratio', 'comparación'],
      {
        headers: ['Unidad', 'Expedientes resueltos', 'Personal asignado'],
        rows: labels.map((label, idx) => [label, String(values[idx]), String(staff[idx])]),
      },
      '¿Qué unidad resolvió más expedientes por persona asignada?',
      labels[bestIndex],
      labels.filter((_, idx) => idx !== bestIndex).slice(0, 3),
      `Los ratios son ${labels
        .map((label, idx) => `${label}: ${numberFormat(ratios[idx], 2)}`)
        .join(', ')}. El mayor corresponde a ${labels[bestIndex]}.`,
    );
  },
  (variant, index) => {
    const total = 800 + variant * 80;
    const digital = 160 + variant * 24;
    const legal = 240 + variant * 20;
    const outreach = total - digital - legal;
    const share = (digital / total) * 100;
    return makeNumericalQuestion(
      index,
      'Planificación de recursos',
      ['porcentaje', 'distribución'],
      {
        headers: ['Línea', 'Importe'],
        rows: [
          ['Digitalización', money(digital)],
          ['Asesoría jurídica', money(legal)],
          ['Comunicación', money(outreach)],
          ['Total', money(total)],
        ],
      },
      '¿Qué porcentaje del total se asignó a digitalización?',
      percent(share, 1),
      [percent(share + 5, 1), percent(share - 4, 1), percent((legal / total) * 100, 1)],
      `Digitalización representa ${money(digital)} de ${money(total)}: ${digital} / ${total} × 100 = ${percent(share, 1)}.`,
    );
  },
  (variant, index) => {
    const start = 300 + variant * 20;
    const closed = 80 + variant * 7;
    const incoming = 35 + variant * 4;
    const target = Math.round(start * 0.85);
    const current = start - closed + incoming;
    const extra = Math.max(0, current - target);
    return makeNumericalQuestion(
      index,
      'Gestión de expedientes',
      ['objetivo', 'backlog'],
      {
        headers: ['Concepto', 'Expedientes'],
        rows: [
          ['Pendientes iniciales', String(start)],
          ['Cerrados', String(closed)],
          ['Nuevos recibidos', String(incoming)],
          ['Objetivo máximo final', String(target)],
        ],
      },
      '¿Cuántos expedientes adicionales deben cerrarse para alcanzar el objetivo máximo final?',
      String(extra),
      [String(extra + 8), String(Math.max(0, extra - 6)), String(extra + 14)],
      `Pendientes actuales = ${start} - ${closed} + ${incoming} = ${current}. Para llegar a ${target}, deben cerrarse ${extra} adicionales.`,
    );
  },
  (variant, index) => {
    const totalHours = 150 + variant * 18;
    const processes = 25 + variant * 3;
    const minutes = (totalHours * 60) / processes;
    return makeNumericalQuestion(
      index,
      'Procesos administrativos',
      ['media', 'tiempo'],
      {
        headers: ['Indicador', 'Valor'],
        rows: [
          ['Horas totales registradas', String(totalHours)],
          ['Procesos completados', String(processes)],
        ],
      },
      '¿Cuál fue el tiempo medio por proceso completado, expresado en minutos?',
      `${numberFormat(minutes, 1)} minutos`,
      [
        `${numberFormat(minutes / 60, 1)} minutos`,
        `${numberFormat(minutes + 12, 1)} minutos`,
        `${numberFormat(minutes - 9, 1)} minutos`,
      ],
      `Tiempo medio = ${totalHours} horas × 60 / ${processes} procesos = ${numberFormat(minutes, 1)} minutos.`,
    );
  },
  (variant, index) => {
    const monthlyCost = 4200 + variant * 350;
    const reduction = 10 + variant;
    const months = 12;
    const annualSaving = (monthlyCost * reduction * months) / 100;
    return makeNumericalQuestion(
      index,
      'Costes cloud',
      ['ahorro', 'porcentaje'],
      {
        headers: ['Concepto', 'Valor'],
        rows: [
          ['Coste mensual actual', money(monthlyCost)],
          ['Reducción prevista', percent(reduction)],
          ['Meses considerados', String(months)],
        ],
      },
      '¿Cuál sería el ahorro anual si se cumple la reducción prevista?',
      money(annualSaving),
      [money(annualSaving / 12), money(annualSaving + monthlyCost), money(annualSaving * 0.9)],
      `Ahorro anual = ${money(monthlyCost)} × ${reduction} % × ${months} = ${money(annualSaving)}.`,
    );
  },
  (variant, index) => {
    const baseline = 100;
    const first = 108 + variant;
    const second = first + 6 + variant;
    const growth = second - baseline;
    return makeNumericalQuestion(
      index,
      'Índices de actividad',
      ['índice', 'crecimiento'],
      {
        headers: ['Año', 'Índice de solicitudes'],
        rows: [
          ['2023', String(baseline)],
          ['2024', String(first)],
          ['2025', String(second)],
        ],
      },
      'Tomando 2023 como base 100, ¿cuál es el crecimiento acumulado en 2025?',
      percent(growth),
      [percent(second - first), percent(first - baseline), percent(growth + 5)],
      `Un índice ${second} frente a base ${baseline} indica un crecimiento acumulado de ${second - baseline} %.`,
    );
  },
  (variant, index) => {
    const hoursPerFile = 6 + variant * 0.5;
    const files = 42 + variant * 4;
    const days = 10;
    const dailyCapacity = 7.5;
    const required = Math.ceil((hoursPerFile * files) / (days * dailyCapacity));
    return makeNumericalQuestion(
      index,
      'Planificación de personal',
      ['capacidad', 'redondeo'],
      {
        headers: ['Concepto', 'Valor'],
        rows: [
          ['Expedientes', String(files)],
          ['Horas por expediente', numberFormat(hoursPerFile, 1)],
          ['Días disponibles', String(days)],
          ['Horas diarias por persona', numberFormat(dailyCapacity, 1)],
        ],
      },
      '¿Cuál es el número mínimo de personas necesarias para terminar en el plazo?',
      String(required),
      [String(required - 1), String(required + 1), String(required + 2)],
      `Horas necesarias = ${numberFormat(hoursPerFile, 1)} × ${files}. Capacidad por persona = ${days} × ${numberFormat(dailyCapacity, 1)}. Se redondea al alza: ${required}.`,
    );
  },
  (variant, index) => {
    const requests = 500 + variant * 50;
    const automated = 180 + variant * 30;
    const manual = requests - automated;
    const autoShare = (automated / requests) * 100;
    return makeNumericalQuestion(
      index,
      'Automatización',
      ['proporción', 'servicios digitales'],
      {
        headers: ['Canal', 'Solicitudes'],
        rows: [
          ['Automático', String(automated)],
          ['Manual', String(manual)],
          ['Total', String(requests)],
        ],
      },
      '¿Qué proporción de solicitudes se tramitó automáticamente?',
      percent(autoShare, 1),
      [percent((manual / requests) * 100, 1), percent(autoShare + 7, 1), percent(autoShare - 5, 1)],
      `Proporción automática = ${automated} / ${requests} × 100 = ${percent(autoShare, 1)}.`,
    );
  },
];

function generateNumerical(): NumericalQuestion[] {
  const questions: NumericalQuestion[] = [];

  numericalMakers.forEach((maker, block) => {
    for (let variant = 0; variant < 10; variant++) {
      const index = block * 10 + variant;
      questions.push(maker(variant, index));
    }
  });

  return questions;
}

const technicalTemplates = [
  {
    category: 'IAM',
    tags: ['RBAC', 'mínimo privilegio'],
    stem: '¿qué ventaja aporta asignar permisos mediante roles en lugar de permisos directos a cada usuario?',
    correct: 'Reduce errores y facilita revisar permisos según funciones homogéneas.',
    distractors: [
      'Elimina la necesidad de autenticar a los usuarios.',
      'Permite compartir contraseñas entre miembros del mismo equipo.',
      'Impide que existan cuentas privilegiadas en la organización.',
    ],
    explanation:
      'RBAC agrupa permisos por rol, lo que simplifica altas, bajas, cambios de puesto y revisiones periódicas.',
  },
  {
    category: 'IAM',
    tags: ['MFA', 'administradores'],
    stem: '¿qué control debe priorizarse para cuentas administrativas expuestas a acceso remoto?',
    correct:
      'Autenticación multifactor resistente al phishing y revisión periódica de privilegios.',
    distractors: [
      'Contraseñas compartidas para acelerar la respuesta a incidentes.',
      'Desactivar los registros de acceso para reducir ruido operativo.',
      'Permitir acceso permanente desde cualquier país sin validación adicional.',
    ],
    explanation:
      'Las cuentas administrativas requieren controles reforzados porque su compromiso tiene alto impacto.',
  },
  {
    category: 'Federación de identidad',
    tags: ['SAML', 'SSO'],
    stem: '¿qué elemento es esencial para confiar en una aserción SAML recibida de un proveedor de identidad?',
    correct: 'Validar la firma, el emisor, la audiencia y la vigencia temporal de la aserción.',
    distractors: [
      'Aceptar cualquier aserción si el nombre del usuario parece correcto.',
      'Convertir la aserción en texto plano y guardarla en el navegador.',
      'Omitir la validación de audiencia cuando el canal usa HTTPS.',
    ],
    explanation:
      'SAML exige validar firma y claims críticos para evitar suplantación o reutilización indebida.',
  },
  {
    category: 'Federación de identidad',
    tags: ['OIDC', 'OAuth2'],
    stem: '¿para qué se usa principalmente un ID token en OpenID Connect?',
    correct: 'Para transportar información de autenticación sobre el usuario hacia el cliente.',
    distractors: [
      'Para conceder permisos de red a un cortafuegos perimetral.',
      'Para sustituir todos los registros de auditoría de una aplicación.',
      'Para cifrar automáticamente la base de datos del proveedor.',
    ],
    explanation:
      'OIDC añade una capa de autenticación sobre OAuth 2.0; el ID token representa la autenticación del usuario.',
  },
  {
    category: 'Federación de identidad',
    tags: ['OAuth2', 'autorización'],
    stem: '¿qué describe mejor un access token de OAuth 2.0?',
    correct:
      'Un artefacto usado para autorizar acceso a recursos concretos durante un tiempo limitado.',
    distractors: [
      'Una prueba universal de identidad válida para cualquier aplicación.',
      'Una copia cifrada de la contraseña del usuario final.',
      'Un certificado raíz que firma todos los dominios internos.',
    ],
    explanation:
      'OAuth 2.0 se centra en autorización delegada; el access token no debe tratarse como contraseña ni identidad universal.',
  },
  {
    category: 'Directorios',
    tags: ['LDAP', 'Active Directory'],
    stem: '¿cuál es una función habitual de LDAP en entornos corporativos?',
    correct: 'Consultar y organizar identidades, grupos y atributos en un directorio.',
    distractors: [
      'Sustituir el cifrado TLS de todas las comunicaciones web.',
      'Calcular automáticamente el riesgo jurídico de un contrato.',
      'Bloquear ataques DDoS a nivel de proveedor de internet.',
    ],
    explanation:
      'LDAP es un protocolo de acceso a directorios y se usa con frecuencia para identidades y grupos.',
  },
  {
    category: 'Acceso privilegiado',
    tags: ['PAM', 'just-in-time'],
    stem: '¿qué práctica reduce mejor el riesgo de privilegios administrativos permanentes?',
    correct: 'Conceder elevación temporal aprobada, registrada y limitada al tiempo necesario.',
    distractors: [
      'Mantener privilegios de administrador local en todos los equipos de oficina.',
      'Guardar claves maestras en una hoja de cálculo compartida.',
      'Usar una cuenta genérica sin trazabilidad para tareas urgentes.',
    ],
    explanation: 'El acceso privilegiado just-in-time reduce exposición y mejora trazabilidad.',
  },
  {
    category: 'Criptografía',
    tags: ['PKI', 'certificados'],
    stem: '¿por qué se valida la cadena de certificación al establecer una conexión TLS?',
    correct: 'Para comprobar que el certificado del servidor deriva de una autoridad de confianza.',
    distractors: [
      'Para medir el ancho de banda disponible entre cliente y servidor.',
      'Para eliminar la necesidad de renovar certificados caducados.',
      'Para convertir automáticamente HTTP en una red privada virtual.',
    ],
    explanation:
      'La confianza en TLS depende de una cadena válida hasta una CA reconocida y de comprobaciones de nombre y vigencia.',
  },
  {
    category: 'Criptografía',
    tags: ['TLS', 'datos en tránsito'],
    stem: '¿qué protege principalmente TLS cuando está correctamente configurado?',
    correct:
      'La confidencialidad e integridad de datos en tránsito y la autenticidad del servidor.',
    distractors: [
      'La disponibilidad física del centro de datos.',
      'La eliminación automática de vulnerabilidades en la aplicación.',
      'La exactitud de los datos introducidos por usuarios autorizados.',
    ],
    explanation:
      'TLS protege comunicaciones en tránsito, pero no corrige fallos lógicos ni garantiza disponibilidad.',
  },
  {
    category: 'Criptografía',
    tags: ['hash', 'integridad'],
    stem: '¿qué propiedad tiene una función hash criptográfica segura?',
    correct:
      'Produce una huella de tamaño fijo y debe ser computacionalmente difícil encontrar colisiones útiles.',
    distractors: [
      'Permite recuperar el texto original si se conoce la clave pública.',
      'Cifra ficheros grandes de forma reversible sin usar claves.',
      'Garantiza que un mensaje no contiene datos personales.',
    ],
    explanation: 'Los hashes se usan para integridad y huellas; no son cifrado reversible.',
  },
  {
    category: 'Criptografía',
    tags: ['firma digital'],
    stem: '¿qué aporta una firma digital válida sobre un documento?',
    correct: 'Integridad del documento y vinculación con la clave privada del firmante.',
    distractors: [
      'Traducción automática del documento a todas las lenguas oficiales.',
      'Anonimización irreversible de todos los datos personales incluidos.',
      'Reducción del tamaño del documento sin pérdida de calidad.',
    ],
    explanation:
      'La firma digital permite detectar modificaciones y asociar la firma a una clave privada concreta.',
  },
  {
    category: 'Criptografía',
    tags: ['cifrado en reposo'],
    stem: '¿qué escenario mitiga principalmente el cifrado de disco en un portátil corporativo?',
    correct: 'Lectura de datos si el equipo se pierde o es robado estando apagado.',
    distractors: [
      'Ejecución de macros maliciosas por un usuario autenticado.',
      'Errores de cálculo en hojas de presupuesto.',
      'Phishing que convence al usuario para entregar su contraseña.',
    ],
    explanation:
      'El cifrado en reposo protege datos almacenados, especialmente ante pérdida física del dispositivo.',
  },
  {
    category: 'Gestión de claves',
    tags: ['rotación', 'KMS'],
    stem: '¿por qué conviene rotar claves criptográficas según una política definida?',
    correct: 'Para limitar el impacto temporal si una clave se ve comprometida.',
    distractors: [
      'Para evitar diseñar controles de acceso sobre quién puede usar la clave.',
      'Para que las claves puedan compartirse por correo sin cifrado.',
      'Para sustituir la necesidad de copias de seguridad.',
    ],
    explanation:
      'La rotación no sustituye otros controles, pero reduce exposición si una clave acaba comprometida.',
  },
  {
    category: 'Gestión de claves',
    tags: ['HSM', 'claves privadas'],
    stem: '¿qué beneficio aporta un HSM en la protección de claves privadas críticas?',
    correct:
      'Mantener operaciones criptográficas en un entorno endurecido que dificulta extraer la clave.',
    distractors: [
      'Aumentar automáticamente el espacio disponible en la red.',
      'Traducir protocolos antiguos a versiones compatibles con móviles.',
      'Eliminar la necesidad de definir responsables de custodia.',
    ],
    explanation:
      'Un HSM protege claves y operaciones sensibles mediante hardware y controles específicos.',
  },
  {
    category: 'Monitorización',
    tags: ['SIEM', 'correlación'],
    stem: '¿cuál es el objetivo principal de un SIEM?',
    correct: 'Centralizar, normalizar y correlacionar eventos para detectar patrones relevantes.',
    distractors: [
      'Reemplazar todos los controles preventivos de red.',
      'Escribir automáticamente código seguro para las aplicaciones.',
      'Garantizar que ningún usuario pueda equivocarse al introducir datos.',
    ],
    explanation:
      'Un SIEM ayuda a detectar y analizar actividad mediante eventos de múltiples fuentes.',
  },
  {
    category: 'Monitorización',
    tags: ['EDR', 'endpoints'],
    stem: '¿qué capacidad se espera de una solución EDR moderna?',
    correct:
      'Recoger telemetría de endpoints, detectar comportamientos sospechosos y apoyar contención.',
    distractors: [
      'Gestionar exclusivamente el inventario de mobiliario de oficina.',
      'Sustituir todos los contratos de soporte con proveedores.',
      'Firmar digitalmente normativas internas sin intervención humana.',
    ],
    explanation:
      'EDR está orientado a endpoints: detección, investigación y respuesta en equipos y servidores.',
  },
  {
    category: 'Redes',
    tags: ['IDS', 'IPS'],
    stem: '¿qué diferencia básica existe entre IDS e IPS?',
    correct:
      'Un IDS detecta y alerta; un IPS puede bloquear tráfico según la política configurada.',
    distractors: [
      'Un IDS cifra discos y un IPS firma contratos.',
      'Un IDS solo se usa para correo y un IPS solo para impresoras.',
      'No existe diferencia operativa entre ambos conceptos.',
    ],
    explanation:
      'IDS es principalmente detector; IPS se sitúa en línea o con capacidad de prevención.',
  },
  {
    category: 'Respuesta a incidentes',
    tags: ['contención', 'ransomware'],
    stem: 'ante un equipo con indicios sólidos de ransomware activo, ¿qué acción inicial es más adecuada?',
    correct: 'Aislar el equipo de la red preservando evidencias y escalar al equipo de respuesta.',
    distractors: [
      'Formatear de inmediato todos los servidores sin recopilar información.',
      'Enviar una captura del rescate a todo el personal externo.',
      'Ignorar el aviso hasta el siguiente ciclo mensual de parches.',
    ],
    explanation:
      'La contención temprana limita propagación, pero debe coordinarse con preservación de evidencias.',
  },
  {
    category: 'Respuesta a incidentes',
    tags: ['evidencias', 'forense'],
    stem: '¿por qué se documenta la cadena de custodia durante una investigación técnica?',
    correct: 'Para demostrar quién accedió a la evidencia, cuándo y bajo qué condiciones.',
    distractors: [
      'Para aumentar la velocidad de descarga de los registros.',
      'Para sustituir el análisis técnico por una aprobación verbal.',
      'Para evitar que la evidencia se almacene cifrada.',
    ],
    explanation: 'La cadena de custodia protege la integridad y credibilidad de la evidencia.',
  },
  {
    category: 'Vulnerabilidades',
    tags: ['CVSS', 'priorización'],
    stem: '¿para qué se usa normalmente CVSS?',
    correct: 'Para puntuar la severidad técnica de vulnerabilidades y apoyar la priorización.',
    distractors: [
      'Para conceder permisos de vacaciones al personal técnico.',
      'Para traducir automáticamente logs de red.',
      'Para calcular la velocidad de una línea de fibra.',
    ],
    explanation:
      'CVSS proporciona una escala común; debe combinarse con contexto de exposición y criticidad del activo.',
  },
  {
    category: 'Vulnerabilidades',
    tags: ['parches', 'exposición'],
    stem: 'si hay dos vulnerabilidades críticas, una en un portal expuesto a internet y otra en un laboratorio aislado, ¿qué criterio de priorización es razonable?',
    correct:
      'Priorizar el portal expuesto si el resto de condiciones de severidad y explotación son comparables.',
    distractors: [
      'Priorizar siempre el activo menos expuesto porque es más fácil de parchear.',
      'No aplicar ningún parche hasta que todas las áreas estén de acuerdo.',
      'Ignorar la exposición externa si ambas tienen el mismo nombre comercial.',
    ],
    explanation:
      'La exposición externa aumenta probabilidad de explotación y suele elevar la prioridad.',
  },
  {
    category: 'Vulnerabilidades',
    tags: ['escaneo', 'inventario'],
    stem: '¿qué requisito previo mejora la utilidad de un programa de gestión de vulnerabilidades?',
    correct: 'Mantener un inventario fiable de activos, propietarios y criticidad.',
    distractors: [
      'Escanear solo activos desconocidos para evitar resultados repetidos.',
      'Eliminar etiquetas de criticidad para que todos los sistemas parezcan iguales.',
      'Ejecutar escaneos sin informar a nadie aunque afecten a producción crítica.',
    ],
    explanation:
      'Sin inventario, es difícil interpretar hallazgos, asignar propietarios y priorizar correcciones.',
  },
  {
    category: 'Continuidad',
    tags: ['backup', '3-2-1'],
    stem: '¿qué expresa la regla 3-2-1 de copias de seguridad?',
    correct:
      'Mantener tres copias, en dos soportes distintos, con una copia fuera del entorno principal.',
    distractors: [
      'Tres usuarios comparten dos contraseñas y una cuenta administrativa.',
      'Tres incidentes se resuelven en dos días con un solo informe final.',
      'Tres firewalls se sustituyen por dos VLAN y una impresora segura.',
    ],
    explanation:
      'La regla 3-2-1 busca resiliencia ante fallos, borrado, ransomware o desastre físico.',
  },
  {
    category: 'Continuidad',
    tags: ['RTO', 'disponibilidad'],
    stem: '¿qué representa el RTO de un servicio?',
    correct: 'El tiempo máximo objetivo para restaurar el servicio tras una interrupción.',
    distractors: [
      'La cantidad máxima de datos que puede perderse medida en tiempo.',
      'El número de administradores asignados a un turno.',
      'El porcentaje de registros que deben anonimizarse.',
    ],
    explanation:
      'RTO se centra en tiempo de recuperación del servicio; RPO se centra en pérdida de datos tolerable.',
  },
  {
    category: 'Continuidad',
    tags: ['RPO', 'copias'],
    stem: '¿qué representa el RPO de un sistema?',
    correct: 'La antigüedad máxima aceptable de los datos restaurados tras un incidente.',
    distractors: [
      'La duración máxima de una reunión de coordinación.',
      'El número de intentos permitidos antes de bloquear una cuenta.',
      'La velocidad mínima de un enlace de red interno.',
    ],
    explanation: 'RPO define cuánta pérdida de datos, medida en tiempo, puede tolerarse.',
  },
  {
    category: 'Continuidad',
    tags: ['restauración', 'pruebas'],
    stem: '¿por qué no basta con comprobar que una copia de seguridad se creó sin error?',
    correct:
      'Porque debe verificarse que puede restaurarse en tiempo y forma cuando sea necesario.',
    distractors: [
      'Porque las copias correctas siempre deben eliminarse tras crearse.',
      'Porque una copia creada sin error nunca contiene datos útiles.',
      'Porque restaurar datos está prohibido en cualquier entorno de prueba.',
    ],
    explanation: 'La utilidad real de una copia se confirma con pruebas de restauración.',
  },
  {
    category: 'Redes',
    tags: ['segmentación', 'movimiento lateral'],
    stem: '¿qué objetivo tiene la segmentación de red en seguridad?',
    correct: 'Limitar el movimiento lateral y aplicar controles diferenciados entre zonas.',
    distractors: [
      'Garantizar que todos los equipos comparten la misma contraseña local.',
      'Hacer que los logs de seguridad desaparezcan al cerrar sesión.',
      'Sustituir por completo la gestión de identidades.',
    ],
    explanation:
      'La segmentación reduce alcance de compromisos y permite políticas específicas por zona.',
  },
  {
    category: 'Redes',
    tags: ['VLAN', 'segmentación'],
    stem: '¿qué precaución conviene recordar sobre las VLAN?',
    correct:
      'Ayudan a separar tráfico, pero deben acompañarse de controles de capa 3/4 y administración segura.',
    distractors: [
      'Una VLAN cifra automáticamente todo el tráfico extremo a extremo.',
      'Las VLAN sustituyen la necesidad de autenticar administradores.',
      'Una VLAN impide cualquier ataque de aplicación web.',
    ],
    explanation:
      'Las VLAN son una herramienta de segmentación, no una solución completa por sí mismas.',
  },
  {
    category: 'Redes',
    tags: ['firewall', 'mínimo privilegio'],
    stem: '¿qué regla general refleja mejor una política de firewall restrictiva?',
    correct: 'Denegar por defecto y permitir solo flujos justificados y documentados.',
    distractors: [
      'Permitir todo el tráfico para simplificar el soporte.',
      'Usar reglas temporales sin fecha de caducidad ni propietario.',
      'Abrir puertos administrativos a internet para evitar VPN.',
    ],
    explanation: 'La política restrictiva aplica mínimo privilegio a flujos de red.',
  },
  {
    category: 'DNS',
    tags: ['DNSSEC', 'integridad'],
    stem: '¿qué aporta DNSSEC cuando está correctamente desplegado?',
    correct: 'Autenticación de origen e integridad de respuestas DNS mediante firmas.',
    distractors: [
      'Cifrado del contenido de todas las páginas web visitadas.',
      'Bloqueo automático de cualquier correo de phishing.',
      'Sustitución de certificados TLS para servidores web.',
    ],
    explanation:
      'DNSSEC protege la integridad/autenticidad de respuestas DNS; no cifra contenido web.',
  },
  {
    category: 'Acceso remoto',
    tags: ['VPN', 'túnel'],
    stem: '¿qué función cumple una VPN corporativa bien configurada?',
    correct: 'Crear un canal cifrado y autenticado hacia recursos autorizados de la organización.',
    distractors: [
      'Hacer anónimo todo el trabajo del usuario frente al propio empleador.',
      'Eliminar la necesidad de aplicar parches en equipos remotos.',
      'Convertir cualquier dispositivo personal en equipo gestionado automáticamente.',
    ],
    explanation:
      'La VPN protege el canal de acceso, pero no sustituye gestión de dispositivos ni parches.',
  },
  {
    category: 'Arquitectura',
    tags: ['Zero Trust', 'verificación'],
    stem: '¿qué principio resume mejor Zero Trust?',
    correct:
      'Verificar explícitamente cada acceso según identidad, contexto, dispositivo y riesgo.',
    distractors: [
      'Confiar siempre en cualquier sistema dentro de la red interna.',
      'Eliminar todos los controles para mejorar la experiencia de usuario.',
      'Conceder privilegios permanentes después del primer inicio de sesión.',
    ],
    explanation: 'Zero Trust evita confianza implícita basada solo en ubicación de red.',
  },
  {
    category: 'Aplicaciones web',
    tags: ['WAF', 'HTTP'],
    stem: '¿para qué se usa un WAF?',
    correct:
      'Para filtrar y monitorizar tráfico HTTP/HTTPS hacia aplicaciones web según reglas de seguridad.',
    distractors: [
      'Para reparar automáticamente todos los defectos del código fuente.',
      'Para reemplazar copias de seguridad de bases de datos.',
      'Para autenticar físicamente visitantes en recepción.',
    ],
    explanation: 'Un WAF puede mitigar ciertos ataques web, aunque no sustituye desarrollo seguro.',
  },
  {
    category: 'Aplicaciones web',
    tags: ['inyección', 'OWASP'],
    stem: '¿qué medida reduce el riesgo de inyección SQL?',
    correct: 'Usar consultas parametrizadas y validación adecuada de entradas.',
    distractors: [
      'Concatenar directamente texto recibido del usuario en consultas.',
      'Dar privilegios de administrador a la cuenta de base de datos de la aplicación.',
      'Mostrar mensajes de error completos con trazas internas al usuario final.',
    ],
    explanation: 'Las consultas parametrizadas separan código y datos, reduciendo inyección.',
  },
  {
    category: 'Aplicaciones web',
    tags: ['XSS', 'codificación'],
    stem: '¿qué control ayuda a prevenir XSS reflejado o almacenado?',
    correct: 'Codificar la salida según el contexto y aplicar una política CSP adecuada.',
    distractors: [
      'Guardar contraseñas en texto claro para acelerar el inicio de sesión.',
      'Desactivar HTTPS en páginas internas.',
      'Permitir HTML arbitrario de usuarios sin filtrado ni codificación.',
    ],
    explanation:
      'XSS se mitiga controlando cómo se interpreta contenido no confiable en el navegador.',
  },
  {
    category: 'Aplicaciones web',
    tags: ['CSRF', 'sesiones'],
    stem: '¿qué defensa es típica frente a CSRF?',
    correct: 'Tokens anti-CSRF impredecibles y atributos SameSite apropiados en cookies.',
    distractors: [
      'Publicar tokens de sesión en la URL para facilitar soporte.',
      'Aceptar cambios de estado mediante GET sin validación adicional.',
      'Desactivar cualquier comprobación de origen para ahorrar latencia.',
    ],
    explanation:
      'CSRF abusa de sesiones existentes; tokens y SameSite reducen solicitudes no autorizadas.',
  },
  {
    category: 'Desarrollo seguro',
    tags: ['secretos', 'vault'],
    stem: '¿cuál es una buena práctica para gestionar secretos de aplicación?',
    correct: 'Almacenarlos en un gestor de secretos con control de acceso, rotación y auditoría.',
    distractors: [
      'Incluirlos en el repositorio para que despliegue todo el equipo.',
      'Enviarlos por chat sin caducidad cuando haya una incidencia.',
      'Usar la misma clave en desarrollo, pruebas y producción indefinidamente.',
    ],
    explanation: 'Los secretos requieren almacenamiento especializado, trazabilidad y rotación.',
  },
  {
    category: 'Desarrollo seguro',
    tags: ['SAST', 'código'],
    stem: '¿qué caracteriza a una herramienta SAST?',
    correct: 'Analiza código fuente o artefactos sin ejecutar la aplicación.',
    distractors: [
      'Solo prueba una aplicación desplegada enviando tráfico HTTP real.',
      'Sustituye revisiones de arquitectura y modelado de amenazas.',
      'Se limita a medir disponibilidad de servidores de producción.',
    ],
    explanation: 'SAST es análisis estático; DAST analiza aplicaciones en ejecución.',
  },
  {
    category: 'Desarrollo seguro',
    tags: ['DAST', 'pruebas'],
    stem: '¿qué caracteriza a una herramienta DAST?',
    correct:
      'Prueba una aplicación en ejecución desde fuera para detectar comportamientos vulnerables.',
    distractors: [
      'Revisa exclusivamente comentarios del código fuente sin ejecutar nada.',
      'Gestiona vacaciones de administradores de sistemas.',
      'Cifra discos completos de portátiles perdidos.',
    ],
    explanation: 'DAST observa el comportamiento de una aplicación desplegada o ejecutándose.',
  },
  {
    category: 'Desarrollo seguro',
    tags: ['dependencias', 'CVE'],
    stem: '¿por qué se escanean dependencias de software?',
    correct:
      'Para identificar bibliotecas con vulnerabilidades conocidas o licencias problemáticas.',
    distractors: [
      'Para ocultar deliberadamente versiones usadas por la aplicación.',
      'Para convertir automáticamente código inseguro en código probado.',
      'Para evitar documentar componentes de terceros.',
    ],
    explanation: 'El análisis de dependencias ayuda a gestionar riesgo de componentes externos.',
  },
  {
    category: 'Protección de datos',
    tags: ['minimización', 'RGPD'],
    stem: '¿qué implica el principio de minimización de datos?',
    correct: 'Recoger y conservar solo los datos necesarios para la finalidad definida.',
    distractors: [
      'Recoger todos los datos posibles por si resultan útiles en el futuro.',
      'Publicar datos personales si proceden de un formulario interno.',
      'Evitar explicar la finalidad para conservar flexibilidad ilimitada.',
    ],
    explanation: 'La minimización limita datos a lo necesario, adecuado y pertinente.',
  },
  {
    category: 'Protección de datos',
    tags: ['DPIA', 'alto riesgo'],
    stem: '¿cuándo es especialmente pertinente una evaluación de impacto relativa a protección de datos?',
    correct:
      'Cuando un tratamiento puede entrañar alto riesgo para derechos y libertades de personas.',
    distractors: [
      'Solo cuando no se usa ningún dato personal.',
      'Únicamente después de publicar los datos en internet.',
      'Exclusivamente para cambiar el logotipo de una intranet.',
    ],
    explanation:
      'La DPIA se usa para analizar y mitigar riesgos altos antes o durante el diseño del tratamiento.',
  },
  {
    category: 'Protección de datos',
    tags: ['brecha', 'notificación'],
    stem: 'si se confirma una brecha de datos personales con riesgo para las personas, ¿qué aspecto debe controlarse cuidadosamente?',
    correct:
      'El plazo de notificación a la autoridad competente desde que la organización tiene constancia.',
    distractors: [
      'La eliminación de todos los registros antes de investigar.',
      'La publicación automática de nombres de personas afectadas en redes sociales.',
      'La suspensión permanente de cualquier sistema no relacionado.',
    ],
    explanation:
      'Las brechas con riesgo activan obligaciones de evaluación y, en su caso, notificación en plazos definidos.',
  },
  {
    category: 'Protección de datos',
    tags: ['encargado', 'contrato'],
    stem: '¿qué debe regular un contrato con un proveedor que trata datos personales por cuenta de la institución?',
    correct:
      'Instrucciones, confidencialidad, medidas de seguridad, subencargados y asistencia en derechos e incidentes.',
    distractors: [
      'Solo el precio, sin ninguna obligación de seguridad o confidencialidad.',
      'La transferencia libre de datos a cualquier tercero sin informar.',
      'La imposibilidad de auditar al proveedor en cualquier circunstancia.',
    ],
    explanation:
      'El tratamiento por encargo exige obligaciones contractuales claras y controlables.',
  },
  {
    category: 'Cumplimiento',
    tags: ['NIS2', 'riesgo'],
    stem: '¿qué enfoque promueve NIS2 para entidades en sectores relevantes?',
    correct:
      'Medidas de gestión de riesgos de ciberseguridad y obligaciones de notificación de incidentes significativos.',
    distractors: [
      'Eliminar toda responsabilidad de la dirección sobre ciberseguridad.',
      'Regular únicamente el diseño gráfico de portales públicos.',
      'Sustituir todas las normas de protección de datos personales.',
    ],
    explanation:
      'NIS2 refuerza gestión de riesgos, gobernanza y notificación en sectores esenciales e importantes.',
  },
  {
    category: 'Monitorización',
    tags: ['logs', 'retención'],
    stem: '¿qué criterio debe aplicarse a la retención de logs de seguridad?',
    correct: 'Conservarlos el tiempo necesario y proporcional, protegiendo acceso e integridad.',
    distractors: [
      'Borrarlos siempre a las veinticuatro horas aunque haya requisitos de investigación.',
      'Conservarlos indefinidamente sin finalidad ni control de acceso.',
      'Permitir que cualquier usuario los modifique para corregir errores.',
    ],
    explanation:
      'Los logs deben equilibrar seguridad, cumplimiento, proporcionalidad y protección frente a alteraciones.',
  },
  {
    category: 'Contratación TIC',
    tags: ['requisitos', 'proveedores'],
    stem: '¿qué conviene incluir en una licitación de servicios TIC críticos?',
    correct:
      'Requisitos de seguridad verificables, evidencias, derechos de auditoría y obligaciones de notificación.',
    distractors: [
      'Solo una descripción estética de la interfaz sin controles técnicos.',
      'Una cláusula que prohíba al comprador revisar medidas de seguridad.',
      'La obligación de usar contraseñas compartidas para simplificar soporte.',
    ],
    explanation:
      'Los requisitos de seguridad deben poder evaluarse y exigirse durante la ejecución contractual.',
  },
  {
    category: 'Cloud',
    tags: ['responsabilidad compartida'],
    stem: '¿qué significa el modelo de responsabilidad compartida en cloud?',
    correct:
      'Proveedor y cliente tienen responsabilidades distintas que dependen del tipo de servicio contratado.',
    distractors: [
      'El proveedor asume siempre todas las tareas, incluidas identidades y configuración del cliente.',
      'El cliente asume siempre el mantenimiento físico de los centros de datos del proveedor.',
      'Ninguna parte necesita documentar controles porque el servicio está en la nube.',
    ],
    explanation:
      'En cloud, responsabilidades cambian entre IaaS, PaaS y SaaS; la configuración del cliente sigue siendo clave.',
  },
  {
    category: 'Cloud',
    tags: ['IAM cloud', 'políticas'],
    stem: '¿qué práctica reduce permisos excesivos en una cuenta cloud?',
    correct:
      'Usar políticas de mínimo privilegio y revisar permisos efectivos con herramientas de análisis.',
    distractors: [
      'Asignar rol de administrador global a todas las cuentas de servicio.',
      'Dejar claves de acceso permanentes sin rotación ni propietario.',
      'Desactivar registros de actividad para reducir almacenamiento.',
    ],
    explanation:
      'La seguridad cloud depende en gran parte de identidades, permisos y registros correctamente configurados.',
  },
  {
    category: 'Cloud',
    tags: ['almacenamiento', 'exposición'],
    stem: '¿qué riesgo aparece al configurar un repositorio de objetos cloud como público por error?',
    correct: 'Exposición no autorizada de documentos o datos almacenados.',
    distractors: [
      'Pérdida automática de todos los certificados TLS de la organización.',
      'Conversión irreversible de ficheros PDF en ejecutables.',
      'Bloqueo físico de las oficinas administrativas.',
    ],
    explanation:
      'La exposición pública accidental de buckets o contenedores es un riesgo común de configuración.',
  },
  {
    category: 'Correo',
    tags: ['SPF', 'DKIM', 'DMARC'],
    stem: '¿qué objetivo tienen SPF, DKIM y DMARC combinados?',
    correct: 'Mejorar la autenticación de correo y reducir suplantación de dominios.',
    distractors: [
      'Cifrar siempre el contenido de todos los adjuntos enviados.',
      'Eliminar la necesidad de formación frente a phishing.',
      'Sustituir la clasificación documental interna.',
    ],
    explanation:
      'Estos controles ayudan a validar remitentes y políticas de dominio, aunque no resuelven todo phishing.',
  },
  {
    category: 'Correo',
    tags: ['phishing', 'concienciación'],
    stem: '¿qué señal debe aumentar la sospecha ante un correo que pide credenciales?',
    correct: 'Urgencia inusual, enlace a dominio no esperado y solicitud de contraseña o MFA.',
    distractors: [
      'Que el mensaje tenga saludo formal y firma corporativa.',
      'Que llegue durante horario laboral.',
      'Que mencione un tema conocido por la organización.',
    ],
    explanation: 'El phishing suele combinar urgencia, enlaces engañosos y petición de secretos.',
  },
  {
    category: 'Clasificación de información',
    tags: ['etiquetado', 'DLP'],
    stem: '¿para qué sirve etiquetar información según sensibilidad?',
    correct: 'Aplicar controles de acceso, retención, cifrado y compartición acordes al riesgo.',
    distractors: [
      'Eliminar la necesidad de saber quién es propietario del documento.',
      'Permitir que todo documento se publique automáticamente.',
      'Garantizar que nunca habrá errores de contenido.',
    ],
    explanation:
      'El etiquetado facilita aplicar controles proporcionales al nivel de sensibilidad.',
  },
  {
    category: 'Gestión de activos',
    tags: ['CMDB', 'propietario'],
    stem: '¿por qué es importante asignar propietario a cada activo TIC?',
    correct: 'Para saber quién acepta riesgos, prioriza cambios y responde a hallazgos.',
    distractors: [
      'Para impedir que el activo tenga controles técnicos.',
      'Para evitar registrar versiones o dependencias.',
      'Para permitir que cualquier persona borre el activo sin aprobación.',
    ],
    explanation: 'La propiedad clara permite responsabilizar decisiones y remediaciones.',
  },
  {
    category: 'Cambio y configuración',
    tags: ['gestión de cambios'],
    stem: '¿qué debe incluir un cambio técnico de alto impacto antes de producción?',
    correct:
      'Evaluación de riesgo, plan de reversión, ventana aprobada y comunicación a afectados.',
    distractors: [
      'Ejecución inmediata sin pruebas para ahorrar documentación.',
      'Cambio de contraseña de todos los usuarios aunque no esté relacionado.',
      'Eliminación de logs para que el despliegue sea más rápido.',
    ],
    explanation:
      'Los cambios críticos requieren control para reducir interrupciones y permitir recuperación.',
  },
  {
    category: 'Configuración segura',
    tags: ['hardening', 'baseline'],
    stem: '¿qué aporta una baseline de configuración segura?',
    correct: 'Un estado esperado contra el que comparar sistemas y detectar desviaciones.',
    distractors: [
      'Una excepción permanente a todos los controles de seguridad.',
      'Un sustituto completo de copias de seguridad.',
      'Un mecanismo para compartir cuentas administrativas.',
    ],
    explanation: 'Las baselines ayudan a estandarizar hardening y supervisar cumplimiento técnico.',
  },
  {
    category: 'Privacidad por diseño',
    tags: ['privacy by design'],
    stem: '¿qué ejemplo encaja con privacidad por diseño?',
    correct:
      'Definir minimización, controles de acceso y retención desde la fase de diseño del servicio.',
    distractors: [
      'Añadir una nota de privacidad después de desplegar sin analizar datos tratados.',
      'Recoger todos los datos posibles para decidir más tarde la finalidad.',
      'Desactivar registros de auditoría porque pueden contener identificadores.',
    ],
    explanation:
      'La privacidad por diseño integra protección de datos desde el inicio, no como añadido tardío.',
  },
  {
    category: 'Terceros',
    tags: ['proveedores', 'riesgo'],
    stem: '¿qué medida es útil al incorporar un proveedor TIC con acceso a sistemas internos?',
    correct:
      'Evaluar su seguridad, limitar accesos, exigir confidencialidad y supervisar actividad relevante.',
    distractors: [
      'Conceder acceso administrador permanente antes de firmar contrato.',
      'Compartir cuentas internas para evitar registrar identidades externas.',
      'Excluir al proveedor de cualquier obligación de notificar incidentes.',
    ],
    explanation:
      'El riesgo de terceros se gestiona con evaluación previa, controles contractuales y supervisión.',
  },
  {
    category: 'Disponibilidad',
    tags: ['DDoS', 'resiliencia'],
    stem: '¿qué medida ayuda frente a ataques DDoS contra un portal público?',
    correct:
      'Usar protección de mitigación DDoS, escalado y filtrado con procedimientos de respuesta.',
    distractors: [
      'Desactivar TLS permanentemente para ahorrar CPU.',
      'Publicar credenciales administrativas para que usuarios reinicien el portal.',
      'Eliminar copias de seguridad porque no influyen en tráfico.',
    ],
    explanation: 'DDoS requiere mitigación de red/aplicación y coordinación operativa.',
  },
  {
    category: 'Gestión de sesiones',
    tags: ['cookies', 'seguridad'],
    stem: '¿qué atributos de cookie ayudan a proteger sesiones web?',
    correct: 'Secure, HttpOnly y SameSite configurados según el caso de uso.',
    distractors: [
      'Public, Editable y Permanent para facilitar depuración.',
      'PlainText, Global y Anonymous en todas las cookies.',
      'NoCache aplicado solo a imágenes estáticas.',
    ],
    explanation:
      'Secure exige HTTPS, HttpOnly reduce robo vía scripts y SameSite mitiga ciertos CSRF.',
  },
  {
    category: 'Autenticación',
    tags: ['contraseñas', 'hash'],
    stem: '¿cómo deben almacenarse contraseñas de usuarios?',
    correct: 'Con algoritmos de hashing de contraseñas adecuados, sal única y parámetros de coste.',
    distractors: [
      'En texto claro para facilitar recuperación por soporte.',
      'Cifradas con una clave publicada en el repositorio.',
      'En cookies del navegador sin caducidad.',
    ],
    explanation:
      'Las contraseñas se verifican con hashes resistentes a fuerza bruta, no se recuperan en claro.',
  },
  {
    category: 'Auditoría',
    tags: ['trazabilidad', 'privilegios'],
    stem: '¿qué debe permitir un registro de auditoría de acciones privilegiadas?',
    correct: 'Vincular acciones a identidades concretas, fecha, sistema afectado y resultado.',
    distractors: [
      'Ocultar qué cuenta ejecutó cada acción para proteger al administrador.',
      'Modificar eventos pasados sin dejar rastro.',
      'Eliminar toda información temporal para ahorrar espacio.',
    ],
    explanation:
      'La trazabilidad de acciones privilegiadas es clave para investigación y rendición de cuentas.',
  },
];

function generateTechnical(): TechnicalQuestion[] {
  const contexts = [
    'En una institución de la UE que prepara un servicio común',
    'En una agencia europea con personal interno y contratistas',
  ];

  return Array.from({ length: 100 }, (_, index) => {
    const template = technicalTemplates[index % technicalTemplates.length];
    const context = contexts[Math.floor(index / technicalTemplates.length)];
    const question = `${context}, ${template.stem}`;
    const optionSet = rotateOptions(template.correct, template.distractors, index + 3);

    return {
      id: `technical-cast-${String(index + 1).padStart(3, '0')}`,
      type: 'technical',
      difficulty: difficulty(index + 3),
      category: template.category,
      tags: ['CAST', 'perfil técnico', ...template.tags],
      question,
      options: optionSet.options,
      correctAnswer: optionSet.correctAnswer,
      explanation: template.explanation,
    };
  });
}

writeQuestions('verbal.cast.generated.json', generateVerbal());
writeQuestions('numerical.cast.generated.json', generateNumerical());
writeQuestions('technical.cast.generated.json', generateTechnical());
