import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('token')
    @ApiQuery({ name: 'id', required: true, type: String })
    async generateToken(@Query('id') id: string) {
        return this.authService.generateToken(id);
    }

}
