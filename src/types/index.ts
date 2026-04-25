export enum TransactionStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Note {
  id: string;
  title: string;
  description: string;
  price: number;
  pdfUrl: string;
  thumbnailUrl: string;
  category: string;
  tags?: string[];
  soldCount?: number;
}

export interface Transaction {
  id: string;
  noteId?: string; // Keep for backward compatibility
  itemIds?: string[];
  items?: { id: string, title: string, price: number }[];
  amount: number;
  status: TransactionStatus;
  screenshotUrl?: string;
  userId: string;
  userEmail: string;
  downloadToken?: string;
  downloaded: boolean;
  createdAt: any;
  updatedAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
