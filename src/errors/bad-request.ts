import CustomError from "./custom-errors";

class BadRequestError extends CustomError {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.statusCode = 400;
  }
}

export default BadRequestError;
