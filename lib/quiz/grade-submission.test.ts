import { describe, expect, it } from 'vitest'
import { gradeTestAnswers, type ClientAnswer, type GradedQuestion } from '@/lib/quiz/grade-submission'

function mc(
  id: string,
  correctOption: string | null,
  points = 1,
): GradedQuestion {
  return {
    id,
    type: 'MULTIPLE_CHOICE',
    correctOption,
    points,
    topic: 'Đại số',
    subject: 'Toán',
  }
}

describe('gradeTestAnswers', () => {
  it('counts a repeated correct id once and keeps the first answer', () => {
    const answers: ClientAnswer[] = [
      { questionId: 'q1', answer: 'A', timeSpentSeconds: 4 },
      { questionId: 'q1', answer: 'B', timeSpentSeconds: 9 },
    ]
    const graded = gradeTestAnswers([mc('q1', 'A', 2)], answers)

    expect(graded).toHaveLength(1)
    expect(graded[0]).toMatchObject({
      questionId: 'q1',
      type: 'MULTIPLE_CHOICE',
      answer: 'A',
      isCorrect: true,
      pointsEarned: 2,
      timeSpentSeconds: 4,
    })
  })

  it('drops an id that is not on the test and keeps question order', () => {
    const graded = gradeTestAnswers(
      [mc('q1', 'A'), mc('q2', 'B')],
      [
        { questionId: 'not-on-test', answer: 'A', timeSpentSeconds: 30 },
        { questionId: 'q2', answer: 'B', timeSpentSeconds: 5 },
        { questionId: 'q1', answer: 'A', timeSpentSeconds: 3 },
      ],
    )

    expect(graded.map((row) => row.questionId)).toEqual(['q1', 'q2'])
    expect(graded.every((row) => row.isCorrect)).toBe(true)
    expect(graded.reduce((sum, row) => sum + row.pointsEarned, 0)).toBe(2)
  })

  it('marks a missing test question wrong', () => {
    const graded = gradeTestAnswers(
      [mc('q1', 'A', 1), mc('q2', 'C', 3)],
      [{ questionId: 'q1', answer: 'A', timeSpentSeconds: 6 }],
    )

    expect(graded[1]).toEqual({
      questionId: 'q2',
      type: 'MULTIPLE_CHOICE',
      topic: 'Đại số',
      subject: 'Toán',
      answer: '',
      isCorrect: false,
      pointsEarned: 0,
      timeSpentSeconds: 0,
    })
  })

  it('scores a multiple-choice row when the client labels it ESSAY', () => {
    const graded = gradeTestAnswers(
      [mc('q1', 'C', 1.5)],
      [
        {
          questionId: 'q1',
          questionType: 'ESSAY',
          answer: 'c',
          timeSpentSeconds: 8,
        },
      ],
    )

    expect(graded[0]).toMatchObject({
      questionId: 'q1',
      type: 'MULTIPLE_CHOICE',
      answer: 'c',
      isCorrect: true,
      pointsEarned: 1.5,
      timeSpentSeconds: 8,
    })
  })

  it('does not treat an empty multiple-choice answer as correct when the key is null or blank', () => {
    const graded = gradeTestAnswers(
      [mc('null-key', null), mc('empty-key', ''), mc('blank-key', '   ')],
      [
        { questionId: 'null-key', answer: '', timeSpentSeconds: 1 },
        { questionId: 'empty-key', answer: '', timeSpentSeconds: 1 },
        { questionId: 'blank-key', answer: '', timeSpentSeconds: 1 },
      ],
    )

    expect(graded).toHaveLength(3)
    for (const row of graded) {
      expect(row.isCorrect).toBe(false)
      expect(row.pointsEarned).toBe(0)
    }
  })

  it('marks a missing true/false question wrong with an empty group', () => {
    const graded = gradeTestAnswers(
      [
        {
          id: 'tf1',
          type: 'TRUE_FALSE_GROUP',
          correctOption: 'T,T,F,T',
          points: 1,
          topic: null,
          subject: 'Toán',
        },
      ],
      [],
    )

    expect(graded[0]).toMatchObject({
      answer: {},
      isCorrect: false,
      pointsEarned: 0,
      timeSpentSeconds: 0,
      type: 'TRUE_FALSE_GROUP',
    })
  })

  it('scores short answers with trim and case-insensitive compare', () => {
    const graded = gradeTestAnswers(
      [
        {
          id: 's1',
          type: 'SHORT_ANSWER',
          correctOption: '  Hà Nội ',
          points: 2,
          topic: null,
          subject: null,
        },
      ],
      [{ questionId: 's1', questionType: 'ESSAY', answer: 'hà nội', timeSpentSeconds: 2 }],
    )

    expect(graded[0]).toMatchObject({
      type: 'SHORT_ANSWER',
      isCorrect: true,
      pointsEarned: 2,
    })
  })

  it('marks essays incorrect with zero points', () => {
    const graded = gradeTestAnswers(
      [
        {
          id: 'e1',
          type: 'ESSAY',
          correctOption: 'model answer',
          points: 5,
          topic: 'Văn',
          subject: 'Ngữ văn',
        },
      ],
      [{ questionId: 'e1', answer: 'student essay', timeSpentSeconds: 40 }],
    )

    expect(graded[0]).toMatchObject({
      type: 'ESSAY',
      isCorrect: false,
      pointsEarned: 0,
      timeSpentSeconds: 40,
    })
  })
})
