import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * ACCESS_MATRIX maps route path patterns to allowed roles.
 *
 * IMPORTANT: Order matters — the more specific pattern
 * `/dashboard/article/:id/operations` must appear BEFORE
 * `/dashboard/article/:groupId` so the OWNER-only restriction
 * on the operations route is not shadowed by the broader match.
 */
export const ACCESS_MATRIX: Record<string, string[]> = {
  '/dashboard/article/:id/operations': ['OWNER', 'ADMIN'],
  '/dashboard/reports/dds': ['OWNER', 'FINANCE_DIRECTOR', 'ADMIN'],
  '/dashboard/reports/company-expenses': ['OWNER', 'FINANCE_DIRECTOR', 'ADMIN'],
  '/dashboard/reports/kitchen': ['OWNER', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR', 'ADMIN'],
  '/dashboard/reports/trends': ['OWNER', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR', 'ADMIN'],
  '/dashboard/article/:groupId': ['OWNER', 'FINANCE_DIRECTOR', 'ADMIN'],
};

@Injectable()
export class DataAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      path: string;
      headers: Record<string, string | undefined>;
    }>();

    const path: string = request.path;
    const role: string | undefined = request.headers['x-user-role'];

    const matchedKey = this.matchPattern(path);

    if (matchedKey !== null) {
      const allowedRoles = ACCESS_MATRIX[matchedKey];
      if (!role || !allowedRoles.includes(role)) {
        throw new ForbiddenException(
          `Access denied for role ${role ?? 'unknown'} on path ${path}`,
        );
      }
    }

    return next.handle();
  }

  /**
   * Converts each ACCESS_MATRIX key from a path-template (e.g. /dashboard/article/:id/operations)
   * into a regex by replacing `:paramName` segments with `[^/]+`, then anchors the result.
   * Returns the first matching key, or null if none match.
   */
  private matchPattern(path: string): string | null {
    for (const pattern of Object.keys(ACCESS_MATRIX)) {
      const regexStr = pattern.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(path)) {
        return pattern;
      }
    }
    return null;
  }
}
