import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTranslationPackDto {
  @ApiProperty({ example: 'km' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Khmer' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ភាសាខ្មែរ' })
  @IsString()
  @IsNotEmpty()
  nativeName: string;

  @ApiProperty({ example: '🇰🇭', required: false })
  @IsOptional()
  @IsString()
  flag?: string;
}

export class VoteTranslationPackDto {
  @ApiProperty({ example: 1, description: '+1 for upvote, -1 for downvote' })
  @IsInt()
  @Min(-1)
  @Max(1)
  vote: number;
}

export class CreateProposalDto {
  @ApiProperty({ example: 'ជម្រាបសួរ' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class VoteProposalDto {
  @ApiProperty({ example: 1, description: '+1 for upvote, -1 for downvote' })
  @IsInt()
  @Min(-1)
  @Max(1)
  vote: number;
}
