import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

class InitUploadDto {
  fileName: string;
  totalChunks: number;
  mimeType: string;
}

class ChunkUploadDto {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
}

class CompleteUploadDto {
  uploadId: string;
  fileName: string;
  mimeType: string;
}

class SingleUploadDto {
  fileName: string;
  mimeType: string;
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
    return this.uploadService.initChunkedUpload(dto.fileName, dto.totalChunks, dto.mimeType);
  }

  @Post('chunk')
  @ApiOperation({ summary: 'Upload single chunk slice' })
  uploadChunk(@Body() dto: ChunkUploadDto) {
    return this.uploadService.saveChunk(dto.uploadId, dto.chunkIndex, dto.totalChunks, dto.data);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete chunked upload and assemble file' })
  complete(@Body() dto: CompleteUploadDto) {
    return this.uploadService.completeChunkedUpload(dto.uploadId, dto.fileName, dto.mimeType);
  }

  @Post('single')
  @ApiOperation({ summary: 'Single request file upload' })
  single(@Body() dto: SingleUploadDto) {
    return this.uploadService.saveSingleFile(dto.fileName, dto.mimeType, dto.data);
  }
}
