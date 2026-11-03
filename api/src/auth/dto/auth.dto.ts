import { IsString, Length } from 'class-validator';
import { CreateUserDto } from '../../users/dto/user.dto';

export class RegisterDto extends CreateUserDto {
  @IsString()
  @Length(8, 72)
  password: string;
}
