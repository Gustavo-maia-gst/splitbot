import { IsString, IsOptional } from 'class-validator';

export class VerifyUserDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  guildId?: string;

  @IsString()
  @IsOptional()
  code?: string;
}
