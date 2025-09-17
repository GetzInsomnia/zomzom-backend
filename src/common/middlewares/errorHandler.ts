import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    reply.status(400).send({
      message: 'Validation failed',
      issues: error.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || error.statusCode === 413) {
    reply.status(413).send({ message: 'Payload too large' });
    return;
  }

  if ((error as any)?.code === 'P2002') {
    reply.status(409).send({ message: 'Conflict: duplicate record' });
    return;
  }

  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error({ err: error }, 'Internal server error');
  }

  reply.status(statusCode).send({
    message: error.message || 'Unexpected error'
  });
}
