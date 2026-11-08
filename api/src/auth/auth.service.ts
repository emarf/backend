import { Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { USER_SELECT } from '../users/public-user';
import { UsersService } from '../users/users.service';
import { DUMMY_HASH, REFRESH_TOKEN_TTL_MS, SESSION_TTL_MS } from './constants';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const DEV_SECRET = 'dev-only-secret';
const TOKEN_EXPIRATION_SECONDS = 900;
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private encode<T>(object: T): string {
    return Buffer.from(JSON.stringify(object)).toString('base64url');
  }

  private decode(token: string) {
    return JSON.parse(Buffer.from(token, 'base64url').toString());
  }

  private sign(data: string) {
    return crypto
      .createHmac('sha256', process.env.JWT_SECRET ?? DEV_SECRET)
      .update(data)
      .digest('base64url');
  }

  private signJwt(userId: number) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.encode(header);
    const iat = Math.floor(new Date().getTime() / 1000);
    const exp = iat + TOKEN_EXPIRATION_SECONDS;
    const payload = { sub: userId, iat, exp };
    const encodedPayload = this.encode(payload);
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  private verify(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      const expected = Buffer.from(key, 'hex');

      crypto.scrypt(password, salt, expected.length, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(crypto.timingSafeEqual(expected, derivedKey));
      });
    });
  }

  private async verifyUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPasswordHash(email);

    const isHashValid = await this.verify(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !user.passwordHash || !isHashValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateRefreshToken(userId: number) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const tokenExpiresDate = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { tokenHash, expiresAt: tokenExpiresDate, userId },
    });

    return token;
  }

  async register({ email, name, password, ...rest }: RegisterDto) {
    const hash = await this.hash(password);
    return this.usersService.create({ email, name, ...rest }, hash);
  }

  async login(dto: LoginDto) {
    const user = await this.verifyUser(dto.email, dto.password);

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const tokenExpiresDate = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt: tokenExpiresDate },
    });

    return {
      user,
      token,
    };
  }

  async findSessionByToken(token: string) {
    const tokenHash = this.hashToken(token);

    return this.prisma.session.findUnique({
      select: { expiresAt: true, user: { select: USER_SELECT } },
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
  }

  async logout(token: string | undefined) {
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const tokenHash = this.hashToken(token);

    const { count } = await this.prisma.session.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });

    if (!count) {
      throw new UnauthorizedException('Not authenticated');
    }
  }

  async token(dto: LoginDto) {
    const user = await this.verifyUser(dto.email, dto.password);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      refreshToken,
      accessToken: this.signJwt(user.id),
      expiresIn: TOKEN_EXPIRATION_SECONDS,
    };
  }

  async verifyToken(token: string) {
    const [headerToken, payloadToken, signatureToken] = token.split('.');
    if (!signatureToken) return null;

    const expected = Buffer.from(
      this.sign(`${headerToken}.${payloadToken}`),
      'base64url',
    );
    const received = Buffer.from(signatureToken, 'base64url');

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return null;
    }

    const payload = this.decode(payloadToken);
    if (payload.exp <= Math.floor(new Date().getTime() / 1000)) return null;

    return this.usersService.getUserById(payload.sub);
  }

  async refresh(previousRefreshToken: string | undefined) {
    if (!previousRefreshToken) {
      throw new UnauthorizedException('Not authenticated');
    }
    const tokenHash = this.hashToken(previousRefreshToken);

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (count === 1) {
      const refreshToken = await this.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash },
      });

      const newRefreshToken = await this.generateRefreshToken(
        refreshToken.userId,
      );

      return {
        refreshToken: newRefreshToken,
        accessToken: this.signJwt(refreshToken.userId),
        expiresIn: TOKEN_EXPIRATION_SECONDS,
      };
    }

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (refreshToken?.usedAt) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: refreshToken.userId },
      });
    }

    throw new UnauthorizedException('Not authenticated');
  }
}
