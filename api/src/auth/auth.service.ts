import { Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { DUMMY_HASH, SESSION_TTL_MS } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  verify(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      const expected = Buffer.from(key, 'hex');

      crypto.scrypt(password, salt, expected.length, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(crypto.timingSafeEqual(expected, derivedKey));
      });
    });
  }

  async register({ email, name, password, ...rest }: RegisterDto) {
    const hash = await this.hash(password);
    return this.usersService.create({ email, name, ...rest }, hash);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPasswordHash(dto.email);

    const isHashValid = await this.verify(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !user.passwordHash || !isHashValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash, ...safeUser } = user;

    const tokenSID = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenSID)
      .digest('hex');
    const tokenExpiresDate = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: { userId: safeUser.id, tokenHash, expiresAt: tokenExpiresDate },
    });

    return {
      user: safeUser,
      token: tokenSID,
    };
  }
}
