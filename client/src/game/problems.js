// Phase 1: 5 hardcoded problems, hand-verified.
// Same schema as /content/problems/*.json will use in Phase 2.
// Steps AFTER the error stay consistent with the error — the "student" didn't notice.

export const problems = [
  {
    id: 'p1-linear-sign',
    topic: 'linear-equations',
    difficulty: 1,
    problem_latex: '\\text{Solve: } 2x + 3 = 11',
    steps: [
      { n: 1, latex: '2x + 3 = 11', correct: true },
      {
        n: 2,
        latex: '2x = 11 + 3',
        correct: false,
        error_type: 'sign-error',
        explanation:
          '+3 moves across = as −3, not +3. Sahi step: 2x = 11 − 3, so 2x = 8 and x = 4.',
      },
      { n: 3, latex: '2x = 14', correct: true, note: 'consistent with the earlier error' },
      { n: 4, latex: 'x = 7', correct: true, note: 'consistent with the earlier error' },
    ],
    diagnosis_options: ['sign-error', 'calc-slip', 'wrong-formula', 'invalid-operation'],
    correct_diagnosis: 'sign-error',
  },
  {
    id: 'p2-distribute-drop',
    topic: 'algebra-simplify',
    difficulty: 1,
    problem_latex: '\\text{Simplify: } 2(x + 3) + 4x',
    steps: [
      { n: 1, latex: '2(x + 3) + 4x', correct: true },
      {
        n: 2,
        latex: '2x + 3 + 4x',
        correct: false,
        error_type: 'dropped-term',
        explanation:
          'The 2 multiplies BOTH terms inside the bracket: 2(x+3) = 2x + 6, not 2x + 3. The ×2 on the 3 got dropped. Sahi answer: 6x + 6.',
      },
      { n: 3, latex: '6x + 3', correct: true, note: 'consistent with the earlier error' },
    ],
    diagnosis_options: ['dropped-term', 'sign-error', 'calc-slip', 'misread-question'],
    correct_diagnosis: 'dropped-term',
  },
  {
    id: 'p3-percent-slip',
    topic: 'percentages',
    difficulty: 1,
    problem_latex: '\\text{Find } 15\\% \\text{ of } 240',
    steps: [
      { n: 1, latex: '15\\% \\text{ of } 240 = \\frac{15}{100} \\times 240', correct: true },
      { n: 2, latex: '= \\frac{3600}{100}', correct: true },
      {
        n: 3,
        latex: '= 360',
        correct: false,
        error_type: 'calc-slip',
        explanation:
          '3600 ÷ 100 = 36, not 360 — one zero kam kata. 360 of 240 is impossible for 15% anyway (answer bigger than the number itself!).',
      },
    ],
    diagnosis_options: ['calc-slip', 'wrong-formula', 'unit-error', 'misread-question'],
    correct_diagnosis: 'calc-slip',
  },
  {
    id: 'p4-circle-formula',
    topic: 'geometry-area',
    difficulty: 2,
    problem_latex: '\\text{Area of a circle, } r = 7 \\text{ cm } (\\pi = \\tfrac{22}{7})',
    steps: [
      {
        n: 1,
        latex: 'A = 2\\pi r',
        correct: false,
        error_type: 'wrong-formula',
        explanation:
          '2πr is the CIRCUMFERENCE formula. Area = πr². Sahi: A = (22/7) × 7 × 7 = 154 cm².',
      },
      { n: 2, latex: 'A = 2 \\times \\tfrac{22}{7} \\times 7', correct: true, note: 'consistent with the earlier error' },
      { n: 3, latex: 'A = 44 \\text{ cm}', correct: true, note: 'consistent with the earlier error' },
    ],
    diagnosis_options: ['wrong-formula', 'unit-error', 'calc-slip', 'wrong-substitution'],
    correct_diagnosis: 'wrong-formula',
  },
  {
    id: 'p5-divide-by-x',
    topic: 'algebra-equations',
    difficulty: 3,
    problem_latex: '\\text{Solve: } x^2 = 5x',
    steps: [
      { n: 1, latex: 'x^2 = 5x', correct: true },
      {
        n: 2,
        latex: '\\frac{x^2}{x} = \\frac{5x}{x}',
        correct: false,
        error_type: 'invalid-operation',
        explanation:
          'Dividing by x is illegal here — x could be 0 (and it is a solution!). Sahi tareeka: x² − 5x = 0 → x(x − 5) = 0 → x = 0 or x = 5. Dividing by x silently killed x = 0.',
      },
      { n: 3, latex: 'x = 5', correct: true, note: 'consistent with the earlier error' },
    ],
    diagnosis_options: ['invalid-operation', 'sign-error', 'wrong-formula', 'dropped-term'],
    correct_diagnosis: 'invalid-operation',
  },
];

export function errorStepOf(problem) {
  return problem.steps.find((s) => !s.correct);
}
