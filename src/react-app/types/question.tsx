export default interface Question {
    id: number
    question: string
    options: string[]
    correctAnswer: number
    explanation?: string
  } 