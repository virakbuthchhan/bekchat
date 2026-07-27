import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

export class InitUploadDto {
  @ApiProperty({ example: 'Voice_Note.webm' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ example: 'audio/webm', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ChunkUploadDto {
  @ApiProperty({ example: 'upload-id-123' })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  chunkIndex: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ example: 'data:audio/webm;base64,...' })
  @IsString()
  @IsNotEmpty()
  data: string;
}

export class CompleteUploadDto {
  @ApiProperty({ example: 'upload-id-123' })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({ example: 'Voice_Note.webm' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'audio/webm', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class SingleUploadDto {
  @ApiProperty({ example: 'Voice_Note.webm' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'audio/webm', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ example: 'data:audio/webm;base64,...' })
  @IsString()
  @IsNotEmpty()
  data: string;
}

@ApiTags('Uploads')
@Controller('api/upload')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('init')
  @ApiOperation({ summary: 'Initialize chunked file upload session' })
  init(@Body() dto: InitUploadDto) {
    return this.uploadService.initChunkedUpload(dto.fileName, dto.totalChunks, dto.mimeType || 'application/octet-stream');
  }

  @Post('chunk')
  @ApiOperation({ summary: 'Upload single chunk slice' })
  uploadChunk(@Body() dto: ChunkUploadDto) {
    return this.uploadService.saveChunk(dto.uploadId, dto.chunkIndex, dto.totalChunks, dto.data);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete chunked upload and assemble file' })
  complete(@Body() dto: CompleteUploadDto) {
    return this.uploadService.completeChunkedUpload(dto.uploadId, dto.fileName, dto.mimeType || 'application/octet-stream');
  }

  @Post('single')
  @ApiOperation({ summary: 'Single request file upload' })
  single(@Body() dto: SingleUploadDto) {
    return this.uploadService.saveSingleFile(dto.fileName, dto.mimeType || 'application/octet-stream', dto.data);
  }
}
