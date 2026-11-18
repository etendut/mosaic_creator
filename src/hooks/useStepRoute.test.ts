import { stepSlug } from './useStepRoute';

describe('stepSlug', () => {
    it('writes a step as it appears in the URL', () => {
        expect(['Image', 'Touch up', 'Print'].map(stepSlug)).toEqual(['image', 'touch-up', 'print']);
    });
});
