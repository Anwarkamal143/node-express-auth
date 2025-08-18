// src/controllers/stripe/customer.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { stringToNumber } from '@/utils';
import { buildPaginationMetaCursor } from '@/utils/api';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';

export const createCustomer = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.email) {
        throw new BadRequestException('Email is required');
      }

      const customer = await stripeService.createCustomer({
        email: req.body.email,
        name: req.body.name,
        phone: req.body.phone,
        metadata: req.body.metadata,
      });

      return SuccessResponse(res, {
        message: 'Customer created successfully',
        data: customer,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const getCustomer = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    const customer = await stripeService.retrieveCustomer(req.params.customerId);
    return SuccessResponse(res, {
      message: 'Customer retrieved successfully',
      data: customer,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const updateCustomer = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.customerId) {
        throw new BadRequestException('Customer ID is required');
      }

      const customer = await stripeService.updateCustomer(req.params.customerId, req.body);
      return SuccessResponse(res, {
        message: 'Customer updated successfully',
        data: customer,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const deleteCustomer = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.customerId) {
        throw new BadRequestException('Customer ID is required');
      }

      const result = await stripeService.deleteCustomer(req.params.customerId);
      return SuccessResponse(res, {
        message: 'Customer deleted successfully',
        data: result,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const listCustomers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = stringToNumber((req.query.limit as string) || '100') as number;
    const customers = await stripeService.listCustomers({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      email: req.query.email as string,
      starting_after: req.query.cursor as string,
    });
    const pagination_meta = buildPaginationMetaCursor({
      items: customers.data,
      hasMore: customers.has_more,
      cursor: req.query.cursor as string,
      limit,
      columnName: 'id',
    });
    return SuccessResponse(res, {
      message: 'Customers listed successfully',
      data: { data: customers.data, pagination_meta },
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const searchCustomers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.query) {
        throw new BadRequestException('Search query is required');
      }

      const results = await stripeService.searchCustomers({
        query: req.body.query,
        limit: req.body.limit || 10,
      });
      return SuccessResponse(res, {
        message: 'Customer search completed',
        data: results,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
