import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    const userId = 'test-user-123';
    const mockToken = 'mock-jwt-token';

    it('should generate a token with valid payload', async () => {
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken(userId);

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: userId });
      expect(result).toEqual({
        access_token: mockToken,
        expires_in: 365 * 24 * 60 * 60,
      });
    });

    it('should return correct expiration time', async () => {
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken(userId);

      expect(result.expires_in).toBe(365 * 24 * 60 * 60);
    });

    it('should throw UnauthorizedException when JWT signing fails', async () => {
      const error = new Error('JWT signing failed');
      mockJwtService.sign.mockImplementation(() => {
        throw error;
      });

      await expect(service.generateToken(userId)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(service.generateToken(userId)).rejects.toThrow(
        'Error generating token',
      );
    });

    it('should handle empty user ID', async () => {
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken('');

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '' });
      expect(result.access_token).toBe(mockToken);
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user@example.com';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken(specialUserId);

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: specialUserId });
      expect(result.access_token).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    const validToken = 'valid-jwt-token';
    const invalidToken = 'invalid-jwt-token';
    const mockPayload = { sub: 'test-user-123', iat: 1234567890 };

    it('should verify a valid token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.verifyToken(validToken);

      expect(jwtService.verify).toHaveBeenCalledWith(validToken);
      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const error = new Error('Invalid token');
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken(invalidToken)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(service.verifyToken(invalidToken)).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      const error = new Error('Malformed token');
      error.name = 'JsonWebTokenError';
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken('malformed.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty token string', async () => {
      const error = new Error('Invalid token');
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      await expect(service.verifyToken('')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should preserve error message in exception', async () => {
      const errorMessage = 'Custom error message';
      const error = new Error(errorMessage);
      mockJwtService.verify.mockImplementation(() => {
        throw error;
      });

      try {
        await service.verifyToken(invalidToken);
      } catch (e: any) {
        expect(e.message).toContain('Invalid token');
        expect(e.response.error).toBe(errorMessage);
      }
    });
  });

  describe('integration', () => {
    it('should generate and verify token in sequence', async () => {
      const userId = 'test-user-456';
      const generatedToken = 'generated-token';
      const payload = { sub: userId, iat: Date.now() };

      mockJwtService.sign.mockReturnValue(generatedToken);
      mockJwtService.verify.mockReturnValue(payload);

      // Generate token
      const tokenResult = await service.generateToken(userId);
      expect(tokenResult.access_token).toBe(generatedToken);

      // Verify token
      const verifiedPayload = await service.verifyToken(generatedToken);
      expect(verifiedPayload.sub).toBe(userId);
    });
  });
});
