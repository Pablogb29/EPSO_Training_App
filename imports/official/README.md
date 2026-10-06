# Materiales oficiales EPSO — Importación manual

Coloca aquí **tus propios** materiales de estudio. EPSO Trainer **no** descarga, hace scraping ni copia contenido de pago automáticamente.

## Archivos incluidos

En esta carpeta puedes colocar:

- `epso_verbal.pdf` / `epso_numeric.pdf` — ejemplos oficiales (referencia)
- Ficheros JSON transcritos manualmente
- EPUBs o libros de práctica (p. ej. *Organising & Prioritising*, 2014) — **otro tipo de prueba**, útil como inspiración pero no idéntico al razonamiento verbal actual

> Los PDF oficiales suelen ser imágenes escaneadas. Transcríbelos a JSON siguiendo el esquema de `src/types/question.ts`.

## Qué puedes añadir


| Formato      | Uso                                                    |
| ------------ | ------------------------------------------------------ |
| **PDFs**     | Tests de muestra, convocatorias, temarios (referencia) |
| **Capturas** | Ítems que transcribes a mano                           |
| **JSON**     | Preguntas propias con el esquema de la app             |
| **Notas**    | Resúmenes, mnemotécnicos, listas de temas              |


## Importar JSON (futuro)

Valida ficheros JSON con:

```bash
npm run import:official
```

Estructura esperada: array de preguntas, o `{ "questions": [...] }`.

Campos obligatorios: `id`, `type`, `difficulty`, `category`, `tags`, `explanation`, `correctAnswer`, más campos según el tipo (ver `src/types/question.ts`).

### Ejemplo verbal (formato EPSO-AST)

```json
{
  "id": "oficial-verbal-001",
  "type": "verbal",
  "difficulty": 3,
  "category": "Oficial EPSO",
  "tags": ["muestra", "oficial"],
  "passage": "Texto del enunciado...",
  "question": "¿Cuál de las siguientes afirmaciones es correcta?",
  "options": [
    "Afirmación A (incorrecta)",
    "Afirmación B (correcta)",
    "Afirmación C (incorrecta)",
    "Afirmación D (incorrecta)"
  ],
  "correctAnswer": 1,
  "explanation": "Motivo de la respuesta..."
}
```

`correctAnswer` es el índice de la opción correcta (0 = A, 1 = B, 2 = C, 3 = D).

## Importante

- Solo añade contenido que puedas usar legalmente.
- No subas materiales con copyright a repositorios públicos.
- Las preguntas de muestra en `src/data/questions/*.sample.json` son originales, no ítems oficiales EPSO.

