import { catchAsync } from '@/middlewares/catchAsync';
import { getUploadStatus, uploadChunkStream } from '@/services/uploader.service';
import { BadRequestException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

class UserController {
  // constructor(public uploaderService: UploadService) {}

  public uploadChunk = catchAsync(async (req: Request, res: Response) => {
    // const { chunkIndex, totalChunks, uploadId, fileName, fileType, fileSize } = req.body;

    await uploadChunkStream(req, res);
  });
  public uploadStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const uploadId = req.query.uploadId as string;
    if (!uploadId) {
      return next(new BadRequestException('Upload ID is required'));
    }
    const { error, ...rest } = await getUploadStatus(uploadId);
    if (error) {
      return next(error);
    }
    return SuccessResponse(res, {
      message: 'upload status',
      data: rest,
    });
  });

  // public cleanUpload = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  //   const uploadId = req.query.uploadId as string;

  //   const { error } = await upload.cleanupUpload(uploadId);
  //   if (error) {
  //     return next(error);
  //   }
  //   return SuccessResponse(res, {
  //     message: 'Upload cleaned',
  //     data: null,
  //     success: true,
  //   });
  // });
}

export default new UserController();
