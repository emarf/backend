import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicUser } from '../users/public-user';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { COOKIE_OPTIONS, SESSION_TTL_MS } from './constants';
import { CurrentUser } from './current-user.decorator';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('/login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(dto);

    res.cookie('sid', token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_MS });

    return user;
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  @Post('/logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.sid;

    await this.authService.logout(token);

    res.clearCookie('sid', COOKIE_OPTIONS);
  }
}
