import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { DevLoginDto } from './dto/dev-login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWechatCode(dto.code);
  }

  @Public()
  @Post('dev/login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.loginWithDevOpenid(dto.openid, dto.nickname);
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }

  @Public()
  @Get('config')
  config() {
    return {
      devLoginEnabled: this.authService.isDevLoginAllowed(),
    };
  }
}
