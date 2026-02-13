import { IsNumber, IsString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class InteractionDataDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  custom_id?: string;

  @IsOptional()
  options?: unknown[];

  @IsOptional()
  values?: string[];
}

export class InteractionDto {
  @IsNumber()
  type: number;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  application_id?: string;

  @IsString()
  @IsOptional()
  token?: string;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsObject()
  @ValidateNested()
  @Type(() => InteractionDataDto)
  @IsOptional()
  data?: InteractionDataDto;

  @IsOptional()
  guild_id?: string;

  @IsOptional()
  channel_id?: string;

  @IsOptional()
  member?: unknown;

  @IsOptional()
  user?: unknown;

  @IsOptional()
  message?: unknown;
}
