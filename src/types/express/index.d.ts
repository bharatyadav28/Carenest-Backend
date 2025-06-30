export {};

declare global {
  namespace Express {
    export interface Request {
      cleanBody: any;
      user: any;
    }
  }
}
