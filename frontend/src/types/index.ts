// frontend/src/types/index.ts
export type CaseType = 'Civil Dispute' | 'Criminal Defense' | 'Family Law' | 'Intellectual Property' | 'Corporate Law' | 'Other';
export type CaseStatus = 'Open' | 'Closed' | 'Pending' | 'Archived';

export interface Case {
  id: number;
  caseNumber: string;
  title: string;
  description?: string;
  type: CaseType;
  status: CaseStatus;
  userId: number;
  createdAt: string;
  updatedAt: string;
}
