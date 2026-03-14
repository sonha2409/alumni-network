import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock unstable_cache to pass through the function directly
vi.mock('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
}));

// Mock Supabase service client
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/service';
import { getIndustries, getSpecializationsByIndustry, getIndustriesWithSpecializations } from './taxonomy';

const mockCreateServiceClient = vi.mocked(createServiceClient);

describe('getIndustries', () => {
  it('should_return_industries_when_query_succeeds', async () => {
    const mockData = [
      { id: '1', name: 'Technology', slug: 'technology', sort_order: 1 },
      { id: '2', name: 'Finance & Banking', slug: 'finance-banking', sort_order: 2 },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceClient>);

    const result = await getIndustries();
    expect(result).toEqual(mockData);
  });

  it('should_return_empty_array_when_query_fails', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceClient>);

    const result = await getIndustries();
    expect(result).toEqual([]);
  });
});

describe('getSpecializationsByIndustry', () => {
  it('should_return_specializations_for_given_industry', async () => {
    const mockData = [
      { id: '10', industry_id: '1', name: 'Software Engineering', slug: 'software-engineering' },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    };

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceClient>);

    const result = await getSpecializationsByIndustry('1');
    expect(result).toEqual(mockData);
  });
});

describe('getIndustriesWithSpecializations', () => {
  it('should_return_industries_with_nested_specializations', async () => {
    const mockData = [
      {
        id: '1',
        name: 'Technology',
        slug: 'technology',
        specializations: [
          { id: '10', name: 'Software Engineering', slug: 'software-engineering' },
        ],
      },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    // The second .order() call resolves the chain
    let orderCallCount = 0;
    chain.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: mockData, error: null });
      }
      return chain;
    });

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceClient>);

    const result = await getIndustriesWithSpecializations();
    expect(result).toEqual(mockData);
    expect(result[0].specializations).toHaveLength(1);
  });
});
