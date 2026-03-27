import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@dashboard/shared-types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when no roles are required', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    const mockRequest = {
      user: { id: 'user-id', role: UserRole.OWNER },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([UserRole.OWNER]);

    const mockRequest = {
      user: null,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user role does not match required roles', () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([UserRole.OWNER, UserRole.FINANCE_DIRECTOR]);

    const mockRequest = {
      user: { id: 'user-id', role: UserRole.OPERATIONS_DIRECTOR },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should return true when user role matches required roles', () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([UserRole.OWNER, UserRole.FINANCE_DIRECTOR]);

    const mockRequest = {
      user: { id: 'user-id', role: UserRole.OWNER },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should return true when user has one of the required roles', () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValue([
        UserRole.FINANCE_DIRECTOR,
        UserRole.OPERATIONS_DIRECTOR,
      ]);

    const mockRequest = {
      user: { id: 'user-id', role: UserRole.FINANCE_DIRECTOR },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
