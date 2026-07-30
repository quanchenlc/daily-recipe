import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

type WechatSession = {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async loginWithWechatCode(code: string) {
    const appId = this.config.get<string>('WECHAT_APP_ID');
    const appSecret = this.config.get<string>('WECHAT_APP_SECRET');
    if (!appId || !appSecret) {
      throw new UnauthorizedException(
        '服务端未配置微信小程序 AppID/AppSecret，请使用开发登录或联系管理员',
      );
    }

    const { data } = await axios.get<WechatSession>(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        params: {
          appid: appId,
          secret: appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
        timeout: 10000,
      },
    );

    if (!data.openid) {
      throw new UnauthorizedException(
        data.errmsg || `微信登录失败（${data.errcode ?? 'unknown'}）`,
      );
    }

    const user = await this.findOrCreateUser(data.openid);
    return this.issueToken(user);
  }

  async loginWithDevOpenid(openid: string, nickname?: string) {
    if (!this.isDevLoginAllowed()) {
      throw new ForbiddenException('开发登录未开启');
    }
    const user = await this.findOrCreateUser(openid, nickname);
    return this.issueToken(user);
  }

  isDevLoginAllowed() {
    return this.config.get<string>('AUTH_ALLOW_DEV_LOGIN') === 'true';
  }

  async me(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      wechatOpenid: user.wechatOpenid,
    };
  }

  private async findOrCreateUser(openid: string, nickname?: string) {
    let user = await this.usersRepo.findOne({ where: { wechatOpenid: openid } });
    if (!user) {
      user = await this.usersRepo.save(
        this.usersRepo.create({
          wechatOpenid: openid,
          nickname: nickname?.trim() || null,
        }),
      );
    } else if (nickname?.trim() && !user.nickname) {
      user.nickname = nickname.trim();
      user = await this.usersRepo.save(user);
    }
    return user;
  }

  private issueToken(user: User) {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '30d');
    const accessToken = this.jwt.sign(
      { sub: user.id },
      { expiresIn: expiresIn as `${number}d` },
    );
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        nickname: user.nickname,
      },
    };
  }
}
