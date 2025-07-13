import { NextFunction, Request, Response } from 'express';

type AsynControllerType = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchAsync =
  (controller: AsynControllerType): AsynControllerType =>
  async (req, res, next) => {
    try {
      return await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
