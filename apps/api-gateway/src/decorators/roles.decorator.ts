import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@dashboard/shared-types';

export const Roles = (roles: UserRole[]) => SetMetadata('roles', roles);
