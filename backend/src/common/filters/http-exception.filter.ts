import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === "string") {
        message = exResponse;
      } else if (typeof exResponse === "object" && exResponse !== null) {
        message = (exResponse as any).message || exception.message;
      }
    } else {
      // Log only the message, not the full stack trace
      const errMessage =
        exception instanceof Error ? exception.message : "Unknown error";
      this.logger.error(`Unhandled exception: ${errMessage}`);
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        statusCode: status,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
