/**
 * Job Order Report API Route
 *
 * Proxy endpoint for fetching job order reports from external API
 * GET /api/orders/job-order-report?barcode={barcode}
 *
 * @module app/api/orders/job-order-report/route
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { JobOrderResultAPIResponseSchema } from '@/features/orders/api/schemas';

/**
 * External API base URL (HTTP protocol)
 */
const EXTERNAL_API_BASE_URL = 'http://43.201.219.117:8080';

/**
 * GET /api/orders/job-order-report
 *
 * Fetches job order report from external API and validates the response
 *
 * @param request - Next.js request object with barcode query parameter
 * @returns Job order report data or error response
 *
 * @example
 * GET /api/orders/job-order-report?barcode=202509-FUJ-0020_00
 */
export async function GET(request: NextRequest) {
  try {
    // Extract barcode from query parameters
    const searchParams = request.nextUrl.searchParams;
    const barcode = searchParams.get('barcode');

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json(
        {
          isSuccess: false,
          error: 'Barcode parameter is required',
          errorMessages: ['바코드 파라미터가 필요합니다.']
        },
        { status: 400 }
      );
    }

    console.log(`📦 Fetching job order report for barcode: ${barcode}`);

    // Call external API (HTTP protocol)
    const externalUrl = `${EXTERNAL_API_BASE_URL}/api/Order/GetJobOrderReport?barCodeString=${encodeURIComponent(barcode)}`;

    const response = await axios.get(externalUrl, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`✅ External API response status: ${response.status}`);

    // Validate response schema
    const validatedData = JobOrderResultAPIResponseSchema.parse(response.data);

    // Check if API call was successful
    if (!validatedData.isSuccess) {
      console.error('❌ External API returned error:', validatedData.errorMessages);
      return NextResponse.json(
        {
          isSuccess: false,
          error: 'External API error',
          errorMessages: validatedData.errorMessages || ['외부 API 오류가 발생했습니다.']
        },
        { status: 500 }
      );
    }

    // Check if result exists
    if (!validatedData.result) {
      console.error('❌ No result data in response');
      return NextResponse.json(
        {
          isSuccess: false,
          error: 'No data found',
          errorMessages: ['주문 데이터를 찾을 수 없습니다.']
        },
        { status: 404 }
      );
    }

    console.log(`✅ Job order report fetched successfully for barcode: ${barcode}`);
    console.log(`   - Order No: ${validatedData.result.jobOrderReports.cusT_ORD_CD}`);
    console.log(`   - Customer: ${validatedData.result.jobOrderReports.cusT_NM}`);
    console.log(`   - Thumbnails: ${validatedData.result.jobOrderThumbnails.length}`);

    // Return validated data
    return NextResponse.json(validatedData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      console.error('❌ Axios error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return NextResponse.json(
          {
            isSuccess: false,
            error: 'Request timeout',
            errorMessages: ['외부 API 요청 시간이 초과되었습니다.']
          },
          { status: 504 }
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            isSuccess: false,
            error: 'Order not found',
            errorMessages: ['주문을 찾을 수 없습니다.']
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          isSuccess: false,
          error: 'External API error',
          errorMessages: [error.message || '외부 API 호출 중 오류가 발생했습니다.']
        },
        { status: error.response?.status || 500 }
      );
    }

    // Handle validation errors (Zod)
    if (error instanceof Error && error.name === 'ZodError') {
      console.error('❌ Zod Validation error:', error);
      // Type cast to access Zod error details
      const zodError = error as any;
      if (zodError.errors) {
        console.error('Zod error details:', JSON.stringify(zodError.errors, null, 2));
      }
      return NextResponse.json(
        {
          isSuccess: false,
          error: 'Invalid response format',
          errorMessages: ['응답 데이터 형식이 올바르지 않습니다.'],
          details: zodError.errors || []
        },
        { status: 500 }
      );
    }

    // Handle unknown errors
    console.error('❌ Unknown error:', error);
    return NextResponse.json(
      {
        isSuccess: false,
        error: 'Internal server error',
        errorMessages: ['서버 내부 오류가 발생했습니다.']
      },
      { status: 500 }
    );
  }
}
