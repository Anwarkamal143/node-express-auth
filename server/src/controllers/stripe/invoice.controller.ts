// src/controllers/stripe/invoice.controller.ts
import { catchAsync } from '@/middlewares/catchAsync';
import stripeService from '@/services/stripe.service';
import { BadRequestException, InternalServerException } from '@/utils/catch-errors';
import { SuccessResponse } from '@/utils/requestResponse';
import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';

export const createInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    const invoice = await stripeService.createInvoice({
      customer: req.body.customerId,
      collection_method: req.body.collectionMethod || 'charge_automatically',
      description: req.body.description,
      metadata: req.body.metadata,
    });

    return SuccessResponse(res, {
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const getInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    const invoice = await stripeService.retrieveInvoice(req.params.invoiceId);
    return SuccessResponse(res, {
      message: 'Invoice retrieved successfully',
      data: invoice,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const finalizeInvoice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.invoiceId) {
        throw new BadRequestException('Invoice ID is required');
      }

      const invoice = await stripeService.finalizeInvoice(req.params.invoiceId);
      return SuccessResponse(res, {
        message: 'Invoice finalized successfully',
        data: invoice,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);

export const payInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    const invoice = await stripeService.payInvoice(req.params.invoiceId);
    return SuccessResponse(res, {
      message: 'Invoice paid successfully',
      data: invoice,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const sendInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    const invoice = await stripeService.sendInvoice(req.params.invoiceId);
    return SuccessResponse(res, {
      message: 'Invoice sent successfully',
      data: invoice,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const voidInvoice = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    const invoice = await stripeService.voidInvoice(req.params.invoiceId);
    return SuccessResponse(res, {
      message: 'Invoice voided successfully',
      data: invoice,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const listInvoices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await stripeService.listInvoices({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      customer: req.query.customerId as string,
      status: req.query.status as Stripe.InvoiceListParams.Status,
    });
    return SuccessResponse(res, {
      message: 'Invoices listed successfully',
      data: invoices,
    });
  } catch (error: any) {
    return next(new InternalServerException(error.message));
  }
});

export const searchInvoices = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body.query) {
        throw new BadRequestException('Search query is required');
      }

      const results = await stripeService.searchInvoices({
        query: req.body.query,
        limit: req.body.limit || 10,
      });
      return SuccessResponse(res, {
        message: 'Invoice search completed',
        data: results,
      });
    } catch (error: any) {
      return next(new InternalServerException(error.message));
    }
  }
);
