import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../context/request-context';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      // Public routes (login, public quote links, etc.) have no user yet —
      // just pass through without a context to tag entries with.
      return next.handle();
    }

    let result: Observable<unknown>;
    RequestContext.run({ tenantId: user.tenantId, userId: user.userId }, () => {
      result = next.handle();
    });
    return result!;
  }
}
