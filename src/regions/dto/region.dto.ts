import {IsBoolean, IsNotEmpty, IsString, MaxLength} from 'class-validator';

export class ActivateRegionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  municipality!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  state!: string;
}

export class UpdateRegionDto {
  @IsBoolean()
  isActive!: boolean;
}
