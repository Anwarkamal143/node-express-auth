import { catchAsync } from '@/middlewares/catchAsync';
import { UploadService } from '@/services/uploader.service';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

class UserController {
  constructor(public uploaderService: UploadService) {}

  public uploadChunk = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // const { chunkIndex, totalChunks, uploadId, fileName, fileType, fileSize } = req.body;
    const { error, chunkIndex, totalChunks, isComplete, finalUrl, uploadId } =
      await this.uploaderService.handleChunkUpload(req.body);

    if (error) {
      return next(error);
    }

    return SuccessResponse(res, {
      message: 'Chunk uploaded',
      data: {
        success: true,
        chunkIndex,
        uploadId,
        totalChunks,
        isComplete,
        finalUrl,
      },
    });
  });
  public uploadStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const uploadId = req.query.uploadId as string;
    const { error, ...rest } = await this.uploaderService.getUploadStatus(uploadId);
    if (error) {
      return next(error);
    }
    return SuccessResponse(res, {
      message: 'upload status',
      data: rest,
    });
  });
  public cleanUpload = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const uploadId = req.query.uploadId as string;

    const { error } = await this.uploaderService.cleanupUpload(uploadId);
    if (error) {
      return next(error);
    }
    return SuccessResponse(res, {
      message: 'Upload cleaned',
      data: null,
      success: true,
    });
  });
}

export default new UserController(new UploadService());
