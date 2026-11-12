import { FastifyRequest } from "fastify";

export type RequestWithBody<T> = FastifyRequest<{ Body: T; }>;
export type RequestWithParams<T> = FastifyRequest<{ Params: T; }>;
export type RequestWithQuery<T> = FastifyRequest<{ Querystring: T; }>;
export type RequestWithParamsAndBody<P, B> = FastifyRequest<{ Params: P; Body: B; }>;
