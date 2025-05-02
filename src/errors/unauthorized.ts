import CustomError from "./custom-errors";

class UnAuthorizedError extends CustomError {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = 403;
  }
}

export default UnAuthorizedError;
