// src/controllers/stripe/product.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const createProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.name) {
      throw new BadRequestException('Product name is required');
    }

    const product = await stripeService.createProduct({
      name: req.body.name,
      description: req.body.description,
      active: req.body.active !== false,
      metadata: req.body.metadata,
    });

    return SuccessResponse(res, {
      message: 'Product created successfully',
      data: product,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const getProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.productId) {
      throw new BadRequestException('Product ID is required');
    }

    const product = await stripeService.retrieveProduct(req.params.productId);
    return SuccessResponse(res, {
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const updateProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.productId) {
      throw new BadRequestException('Product ID is required');
    }

    const product = await stripeService.updateProduct(req.params.productId, req.body);
    return SuccessResponse(res, {
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const deleteProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.productId) {
      throw new BadRequestException('Product ID is required');
    }

    const result = await stripeService.deleteProduct(req.params.productId);
    return SuccessResponse(res, {
      message: 'Product deleted successfully',
      data: result,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const listProducts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await stripeService.listProducts({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      active: req.query.active !== 'false',
    });
    return SuccessResponse(res, {
      message: 'Products listed successfully',
      data: products,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const searchProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.query) {
        throw new BadRequestException('Search query is required');
      }

      const results = await stripeService.searchProducts({
        query: req.body.query,
        limit: req.body.limit || 10,
      });
      return SuccessResponse(res, {
        message: 'Product search completed',
        data: results,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const createPrice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.productId || !req.body.unitAmount || !req.body.currency) {
      throw new BadRequestException('Product ID, unit amount and currency are required');
    }

    const price = await stripeService.createPrice({
      product: req.body.productId,
      unit_amount: req.body.unitAmount,
      currency: req.body.currency,
      recurring: req.body.recurring,
      active: req.body.active !== false,
      metadata: req.body.metadata,
    });

    return SuccessResponse(res, {
      message: 'Price created successfully',
      data: price,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const getPrice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.priceId) {
      throw new BadRequestException('Price ID is required');
    }

    const price = await stripeService.retrievePrice(req.params.priceId);
    return SuccessResponse(res, {
      message: 'Price retrieved successfully',
      data: price,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const updatePrice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.priceId) {
      throw new BadRequestException('Price ID is required');
    }

    const price = await stripeService.updatePrice(req.params.priceId, req.body);
    return SuccessResponse(res, {
      message: 'Price updated successfully',
      data: price,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const listPrices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prices = await stripeService.listPrices({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      product: req.query.productId as string,
      active: req.query.active !== 'false',
    });
    return SuccessResponse(res, {
      message: 'Prices listed successfully',
      data: prices,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const searchPrices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.query) {
      throw new BadRequestException('Search query is required');
    }

    const results = await stripeService.searchPrices({
      query: req.body.query,
      limit: req.body.limit || 10,
    });
    return SuccessResponse(res, {
      message: 'Price search completed',
      data: results,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});
