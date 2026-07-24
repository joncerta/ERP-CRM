import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicApiPrincipal } from './api-key.guard';

export const CurrentApiKey = createParamDecorator((_: unknown, ctx: ExecutionContext): PublicApiPrincipal => {
  const request = ctx.switchToHttp().getRequest();
  return request.publicApiKey;
});
