import CustomError from "./custom-errors";

class UnauthenticatedError extends CustomError {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

export default UnauthenticatedError;
