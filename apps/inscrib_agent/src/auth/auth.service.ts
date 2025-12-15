import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Service responsible for authentication and JWT token management.
 * Provides token generation and verification functionality for user authentication.
 */
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generates a JWT access token for a given user ID.
   *
   * @param {string} id - The user identifier to include in the token payload
   * @returns {Promise<{access_token: string, expires_in: number}>} Object containing the JWT token and expiration time in seconds
   * @throws {UnauthorizedException} If token generation fails
   *
   * @example
   * const result = await authService.generateToken('user123');
   * // Returns: { access_token: 'eyJhbGc...', expires_in: 31536000 }
   */
  async generateToken(id: string) {
    try {
      const payload = { sub: id };
      console.log('Generating token with payload:', payload);

      const token = this.jwtService.sign(payload);
      console.log('Generated token:', token);

      return {
        access_token: token,
        expires_in: 365 * 24 * 60 * 60, // 1 year in seconds
      };
    } catch (error) {
      console.error('Error generating token:', error);
      throw new UnauthorizedException({
        message: 'Error generating token',
        error: error.message,
      });
    }
  }

  /**
   * Verifies a JWT token and returns the decoded payload.
   *
   * @param {string} token - The JWT token to verify
   * @returns {Promise<any>} The decoded token payload containing user information
   * @throws {UnauthorizedException} If the token is invalid, expired, or malformed
   *
   * @example
   * const payload = await authService.verifyToken('eyJhbGc...');
   * // Returns: { sub: 'user123', iat: 1234567890, exp: 1234567890 }
   */
  async verifyToken(token: string) {
    console.log('token', token);
    try {
      return await this.jwtService.verify(token);
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new UnauthorizedException({
        message: 'Invalid token',
        error: error.message,
      });
    }
  }
}
