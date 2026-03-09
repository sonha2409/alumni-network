import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

// Build a chainable mock that records calls
function createChainableMock(finalData: unknown, finalError: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      // Return the chain, but also make it thenable for the final result
      return Object.assign({...chain}, {
        then: (resolve: (val: unknown) => void) => resolve({ data: finalData, error: finalError }),
      });
    }),
  };
  // Make the initial chain also thenable (for cases with no .order())
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getIndustries, getSpecializationsByIndustry, getIndustriesWithSpecializations } from './taxonomy';

const mockCreateClient = vi.mocked(createClient);

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

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getIndustries();
    expect(result).toEqual(mockData);
  });

  it('should_return_empty_array_when_query_fails', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

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

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

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

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getIndustriesWithSpecializations();
    expect(result).toEqual(mockData);
    expect(result[0].specializations).toHaveLength(1);
  });
});
