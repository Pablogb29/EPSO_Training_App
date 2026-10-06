import type { Question } from '@/types/question';
import { es } from '@/i18n/es';

interface QuestionRendererProps {
  question: Question;
  selected: string | number | null;
  onSelect: (value: string | number) => void;
  showResult: boolean;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  selected,
  onSelect,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'verbal':
      return (
        <MultipleChoiceView
          prompt={
            <>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 mb-4">
                <p className="text-sm text-slate-400 mb-2">{es.verbal.passage}</p>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{question.passage}</p>
              </div>
              <p className="text-slate-100 font-medium">{question.question}</p>
            </>
          }
          options={question.options}
          selected={selected}
          correctAnswer={question.correctAnswer}
          onSelect={onSelect}
          showResult={showResult}
          disabled={disabled}
          layout="stack"
        />
      );
    case 'numerical':
      return (
        <MultipleChoiceView
          prompt={
            <>
              {question.imageUrl ? (
                <QuestionImage src={question.imageUrl} alt="Numerical data chart" />
              ) : null}
              {question.dataTable &&
              question.dataTable.headers.length > 0 &&
              question.dataTable.rows.length > 0 ? (
                <div className="mt-3">
                  <DataTable table={question.dataTable} />
                </div>
              ) : null}
              <p className="mt-4 text-slate-200 whitespace-pre-wrap">{question.question}</p>
            </>
          }
          options={question.options}
          selected={selected}
          correctAnswer={question.correctAnswer}
          onSelect={onSelect}
          showResult={showResult}
          disabled={disabled}
        />
      );
    case 'abstract':
      return (
        <MultipleChoiceView
          prompt={
            <>
              <p className="text-slate-200 mb-3">{question.prompt}</p>
              {question.imageUrl ? (
                <QuestionImage src={question.imageUrl} alt="Abstract reasoning diagram" />
              ) : question.promptSvg ? (
                <div
                  className="bg-slate-900 rounded-lg p-3 border border-slate-700 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: question.promptSvg }}
                />
              ) : null}
              <p className="mt-3 text-xs text-slate-500">{es.abstract.imageHint}</p>
            </>
          }
          options={
            question.optionSvgs && question.optionSvgs.length > 0
              ? question.optionSvgs.map((_, i) => es.abstract.option(i + 1))
              : question.options
          }
          selected={selected}
          correctAnswer={question.correctAnswer}
          onSelect={onSelect}
          showResult={showResult}
          disabled={disabled}
          renderOption={
            question.optionSvgs && question.optionSvgs.length > 0
              ? (index) => (
                  <div className="pointer-events-none flex min-h-24 flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {String.fromCharCode(65 + index)}. {es.abstract.option(index + 1)}
                    </span>
                    <div
                      className="flex flex-1 items-center justify-center [&_svg]:h-20 [&_svg]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: question.optionSvgs![index] }}
                    />
                  </div>
                )
              : undefined
          }
        />
      );
    case 'digital':
    case 'eu':
    case 'technical':
      return (
        <MultipleChoiceView
          prompt={
            <div>
              <span className="text-xs text-amber-400/80 uppercase tracking-wide">
                {question.category} · {es.practice.difficulty(question.difficulty)}
              </span>
              <p className="mt-2 text-slate-200 whitespace-pre-wrap">{question.question}</p>
            </div>
          }
          options={question.options}
          selected={selected}
          correctAnswer={question.correctAnswer}
          onSelect={onSelect}
          showResult={showResult}
          disabled={disabled}
          layout="stack"
        />
      );
  }
}

function QuestionImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-white p-2">
      <img src={src} alt={alt} className="mx-auto max-h-[70vh] w-auto max-w-full object-contain" />
    </div>
  );
}

function DataTable({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th
                key={h}
                className="border border-slate-600 px-3 py-2 bg-slate-800 text-left text-slate-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-slate-700 px-3 py-2 text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MultipleChoiceView({
  prompt,
  options,
  selected,
  correctAnswer,
  onSelect,
  showResult,
  disabled,
  renderOption,
  layout = 'grid',
}: {
  prompt: React.ReactNode;
  options: string[];
  selected: string | number | null;
  correctAnswer: number;
  onSelect: (v: string | number) => void;
  showResult: boolean;
  disabled: boolean;
  renderOption?: (index: number) => React.ReactNode;
  layout?: 'grid' | 'stack';
}) {
  const containerClass = layout === 'stack' ? 'flex flex-col gap-2' : 'grid gap-2 sm:grid-cols-2';

  return (
    <div className="space-y-4">
      <div>{prompt}</div>
      <div className={containerClass}>
        {options.map((opt, index) => {
          const isSelected = selected === index;
          const isCorrect = index === correctAnswer;
          let btnClass = 'border-slate-600 bg-slate-800 hover:border-slate-500';
          if (showResult && isCorrect) btnClass = 'border-green-500 bg-green-900/30';
          else if (showResult && isSelected && !isCorrect)
            btnClass = 'border-red-500 bg-red-900/30';
          else if (isSelected) btnClass = 'border-blue-500 bg-blue-900/30';

          const customOptionClass = renderOption ? 'min-h-32' : '';

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              className={`p-3 rounded-lg border text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 ${customOptionClass} ${btnClass}`}
            >
              {renderOption ? (
                renderOption(index)
              ) : (
                <span className="text-slate-200">
                  <span className="text-slate-500 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {opt}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
