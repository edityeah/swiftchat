export const NAMO_PENDING = [
  { name: 'Priya Patel', cls: '9-A', issue: 'Bank passbook pending', status: 'pending' },
  { name: 'Meena Shah', cls: '8-B', issue: 'Aadhaar mismatch', status: 'pending' },
  { name: 'Hema Trivedi', cls: '10-A', issue: 'Phone verification pending', status: 'pending' },
]

export const NAMO_REJECTED = [
  { name: 'Sonal Joshi', cls: '7-B', reason: 'Attendance < 75% (3 consecutive months)', date: 'March 10' },
  { name: 'Rita Patel', cls: '9-C', reason: 'Invalid bank account — account closed', date: 'March 5' },
]

export function scholarshipAmount(cls) {
  const n = parseInt(cls)
  return n >= 9 ? '₹25,000/year' : '₹10,000/year'
}
