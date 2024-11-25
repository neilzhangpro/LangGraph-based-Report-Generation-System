import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    async generateToken(id: string) {
      const payload = { sub: id };
      console.log('Generating token with payload:', payload); // 添加日志
      
      const token = this.jwtService.sign(payload);
      console.log('Generated token:', token); // 添加日志
      
      return {
        access_token: token,
        expires_in: 1800,
      };
    }

    async verifyToken(token: string) {
      console.log('token', token);
        try {
          return await this.jwtService.verify(token);
        } catch (error) {
          throw new UnauthorizedException('Invalid token');
        }
      }
    
}
