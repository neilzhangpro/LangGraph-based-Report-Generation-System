import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    async generateToken(id: string) {
      try {
        const payload = { sub: id };
        console.log('Generating token with payload:', payload); // 添加日志
        
        const token = this.jwtService.sign(payload);
        console.log('Generated token:', token); // 添加日志
        
        return {
          access_token: token,
          expires_in: 365 * 24 * 60 * 60,
        };
      } catch (error) {
        console.error('Error generating token:', error); // 添加日志
        throw new UnauthorizedException({
          message: 'Error generating token',
          error: error.message,
        });
      }
    }

    async verifyToken(token: string) {
      console.log('token', token);
        try {
          return await this.jwtService.verify(token);
        } catch (error) {
          console.error('Error verifying token:', error); // 添加日志
          throw new UnauthorizedException({
            message: 'Invalid token',
            error: error.message,
          });
        }
      }
    
}
