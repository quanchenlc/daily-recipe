import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DevLoginDto {
  @IsString()
  @IsNotEmpty()
  openid: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}
