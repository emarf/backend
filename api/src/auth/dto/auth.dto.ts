import { IsEmail, IsString, Length } from 'class-validator';
import { CreateUserDto } from '../../users/dto/user.dto';
import { Transform } from 'class-transformer';

export class RegisterDto extends CreateUserDto {
  @IsString()
  @Length(8, 72)
  password: string;
}

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
