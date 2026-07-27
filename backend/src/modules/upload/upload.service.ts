import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly tempDir = path.join(process.cwd(), 'uploads', 'temp');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  initChunkedUpload(fileName: string, totalChunks: number, mimeType: string) {
    const uploadId = `${Date.now()}_${randomUUID().substring(0, 8)}`;
    const sessionDir = path.join(this.tempDir, uploadId);
    fs.mkdirSync(sessionDir, { recursive: true });

    return {
      uploadId,
      fileName,
      totalChunks,
      mimeType,
    };
  }

  async saveChunk(uploadId: string, chunkIndex: number, totalChunks: number, base64Data: string) {
    const sessionDir = path.join(this.tempDir, uploadId);
    if (!fs.existsSync(sessionDir)) {
      throw new BadRequestException('Invalid or expired upload session');
    }

    const chunkPath = path.join(sessionDir, `chunk_${chunkIndex}`);
    const cleanBase64 = base64Data.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    await fs.promises.writeFile(chunkPath, buffer);

    return { success: true, chunkIndex };
  }

  async completeChunkedUpload(uploadId: string, fileName: string, mimeType: string) {
    const sessionDir = path.join(this.tempDir, uploadId);
    if (!fs.existsSync(sessionDir)) {
      throw new BadRequestException('Upload session directory not found');
    }

    const safeFileName = fileName || `file_${Date.now()}`;
    const safeMimeType = mimeType || 'application/octet-stream';
    const ext = path.extname(safeFileName) || (safeMimeType.includes('webm') ? '.webm' : '');
    const safeBaseName = path.basename(safeFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
    const uniqueFileName = `${safeBaseName}_${Date.now()}${ext}`;
    const finalPath = path.join(this.uploadDir, uniqueFileName);

    const chunkFiles = fs.readdirSync(sessionDir)
      .filter((f) => f.startsWith('chunk_'))
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10));

    const writeStream = fs.createWriteStream(finalPath);

    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(sessionDir, chunkFile);
      const data = await fs.promises.readFile(chunkPath);
      writeStream.write(data);
    }
    writeStream.end();

    // Clean up temporary chunk directory
    await fs.promises.rm(sessionDir, { recursive: true, force: true });

    const stats = fs.statSync(finalPath);

    return {
      fileUrl: `/uploads/${uniqueFileName}`,
      fileName: safeFileName,
      fileSize: Math.round(stats.size),
      mimeType: safeMimeType,
    };
  }

  async saveSingleFile(fileName: string, mimeType: string, base64Data: string) {
    if (!base64Data) {
      throw new BadRequestException('No file data provided');
    }

    const safeFileName = fileName || `file_${Date.now()}`;
    const safeMimeType = mimeType || 'application/octet-stream';
    const ext = path.extname(safeFileName) || (safeMimeType.includes('webm') ? '.webm' : '');
    const safeBaseName = path.basename(safeFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
    const uniqueFileName = `${safeBaseName}_${Date.now()}${ext}`;
    const finalPath = path.join(this.uploadDir, uniqueFileName);

    const cleanBase64 = base64Data.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    await fs.promises.writeFile(finalPath, buffer);

    const stats = fs.statSync(finalPath);

    return {
      fileUrl: `/uploads/${uniqueFileName}`,
      fileName: safeFileName,
      fileSize: Math.round(stats.size),
      mimeType: safeMimeType,
    };
  }
}
