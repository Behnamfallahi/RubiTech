import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      role: string;
      email?: string | null;
      name?: string | null;
    }

    // Augment the existing Express Request interface
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};


