import { verifyRange, expandRange } from '../src/helpers';

describe('helpers', () => {
    describe('verifyRange', () => {
        const tests = [
            { range: '', expected: false },
            { range: 'hello', expected: false },
            { range: '192.168.0.hello', expected: false },
            { range: '192.168.0.[-0-255]', expected: false },
            { range: '192.168.0.1', expected: true },
            { range: '192.168.0.[0-255]', expected: true },
            { range: '192.168.[0-255].1', expected: true },
            { range: '192.[0-255].0.1', expected: true },
            { range: '[0-255].168.0.1', expected: true },
        ];

        tests.forEach((test) => {
            it(`should return ${test.expected} for ${test.range}`, () => {
                expect(verifyRange(test.range)).toBe(test.expected);
            });
        });
    });

    describe('expandRange', () => {
        const tests = [
            { range: '192.168.0.1', expected: ['192.168.0.1'] },
            { range: '192.168.0.[1-2]', expected: ['192.168.0.1', '192.168.0.2'] },
            { range: '192.168.[1-2].1', expected: ['192.168.1.1', '192.168.2.1'] },
            { range: '192.[1-2].0.1', expected: ['192.1.0.1', '192.2.0.1'] },
            { range: '[1-2].168.0.1', expected: ['1.168.0.1', '2.168.0.1'] },
            {
                range: '192.168.0.[0-10]',
                expected: [
                    '192.168.0.0',
                    '192.168.0.1',
                    '192.168.0.2',
                    '192.168.0.3',
                    '192.168.0.4',
                    '192.168.0.5',
                    '192.168.0.6',
                    '192.168.0.7',
                    '192.168.0.8',
                    '192.168.0.9',
                    '192.168.0.10',
                ],
            },
            {
                range: '[1-2].[1-2].[1-2].[1-2]',
                expected: [
                    '1.1.1.1',
                    '1.1.1.2',
                    '1.1.2.1',
                    '1.1.2.2',

                    '1.2.1.1',
                    '1.2.1.2',
                    '1.2.2.1',
                    '1.2.2.2',

                    '2.1.1.1',
                    '2.1.1.2',
                    '2.1.2.1',
                    '2.1.2.2',

                    '2.2.1.1',
                    '2.2.1.2',
                    '2.2.2.1',
                    '2.2.2.2',
                ],
            },
        ];

        tests.forEach((test) => {
            it(`for range ${test.range} should return ${test.expected.map((ip) => `'${ip}'`).join(', ')}`, () => {
                expect(expandRange(test.range)).toEqual(test.expected);
            });
        });
    });
});
