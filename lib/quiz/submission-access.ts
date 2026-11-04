export function canReadSubmission(input: {
  role: string
  callerId: string
  studentId: string
  classTeacherId: string | null
}): boolean {
  if (input.role === 'admin') return true
  if (input.role === 'teacher') return input.classTeacherId === input.callerId
  return input.callerId === input.studentId
}
