import { describe, it, expect, vi } from 'vitest';
import { processGpaBatchIngestion } from '@/lib/gpa/ingest';
import { GpaBatchIngestionPayload } from '@/lib/gpa/types';

describe('GPA Batch Ingestion Payload Pipeline', () => {
  const verifiedAsm1Payload: GpaBatchIngestionPayload = {
    title: {
      gpa_title_id: 13,
      title_name: 'Amazing Spider-Man, The',
      publisher: 'Marvel Comics',
      publication_year: 1963,
    },
    issue: {
      gpa_issue_id: 1,
      issue_number_raw: '1',
      gpa_url: 'https://comics.gpanalysis.com/analyse-prices/sales-data/13/1',
    },
    editions: [
      {
        edition_name: 'Regular',
        variant_name: null,
        is_regular_edition: true,
        grade_summaries: [
          {
            grader: 'CGC',
            grade: '7.0',
            designation: 'UNI',
            serial: '13-1-CGC-7.0-UNI',
            avg_2024: 18500,
            avg_2025: 23075,
            yearly_aggregates: [
              {
                year: 2025,
                count_sold: 6,
                high_price: 28000,
                low_price: 19200,
                avg_price: 23075,
                observations: [
                  {
                    displayed_date_text: 'Sep-11',
                    displayed_price_text: '$19,800',
                    parsed_numeric_price: 19800,
                    certification_number: '4244095001',
                    evidence_redirect_path: '/external/1',
                  },
                  {
                    displayed_date_text: 'Jun-16',
                    displayed_price_text: '$19,200',
                    parsed_numeric_price: 19200,
                    certification_number: '4147361002',
                    evidence_redirect_path: '/external/2',
                  },
                  {
                    displayed_date_text: 'Jun-09',
                    displayed_price_text: '$26,450',
                    parsed_numeric_price: 26450,
                    certification_number: '1226390001',
                    evidence_redirect_path: '/external/3',
                  },
                  {
                    displayed_date_text: 'May-29',
                    displayed_price_text: '$28,000',
                    parsed_numeric_price: 28000,
                    certification_number: '4412241002',
                    evidence_redirect_path: '/external/4',
                  },
                  {
                    displayed_date_text: 'May-04',
                    displayed_price_text: '$24,000',
                    parsed_numeric_price: 24000,
                    certification_number: '0794396001',
                    evidence_redirect_path: '/external/5',
                  },
                  {
                    displayed_date_text: 'Feb-20',
                    displayed_price_text: '$21,000',
                    parsed_numeric_price: 21000,
                    certification_number: '0086392001',
                    evidence_redirect_path: '/external/6',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it('correctly processes hierarchical payload and inserts observations', async () => {
    const createQueryBuilder = (table: string) => {
      const builder: any = {
        upsert: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        or: vi.fn(() => builder),
        limit: vi.fn(() => ({
          data: [
            {
              id: 'comic-asm-1',
              series: 'Amazing Spider-Man, The',
              title: 'The Amazing Spider-Man',
              issue_number: '1',
              publication_year: 1963,
            },
          ],
          error: null,
        })),
        single: vi.fn(() => ({
          data: {
            id: `mock-${table}-id`,
            gpa_title_id: 13,
            gpa_issue_id: 1,
            edition_name: 'Regular',
            grader: 'CGC',
            grade: '7.0',
            designation: 'UNI',
            year: 2025,
          },
          error: null,
        })),
        maybeSingle: vi.fn(() => ({
          data: null, // Simulate first-time insert
          error: null,
        })),
      };
      return builder;
    };

    const mockSupabase: any = {
      from: vi.fn((table: string) => createQueryBuilder(table)),
    };

    const result = await processGpaBatchIngestion(mockSupabase, verifiedAsm1Payload);

    expect(result.success).toBe(true);
    expect(result.title_id).toBe(13);
    expect(result.issue_id).toBe(1);
    expect(result.editions_count).toBe(1);
    expect(result.summaries_count).toBe(1);
    expect(result.aggregates_count).toBe(1);
    expect(result.observations_inserted).toBe(6);
    expect(result.observations_skipped_duplicate).toBe(0);
    expect(result.match_staged).toBe(true);
    expect(result.matched_comic_id).toBe('comic-asm-1');
  });
});
