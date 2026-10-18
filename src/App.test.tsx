import { render, screen } from '@testing-library/react';
import App from './App';

describe('<App />', () => {
    it('starts on the image step', () => {
        render(<App />);
        expect(screen.getByRole('heading', { name: 'Mosaic Creator' })).toBeInTheDocument();
        expect(screen.getByText('Drop an image here')).toBeVisible();
        expect(screen.getAllByRole('button', { name: 'Choose an image' })).toHaveLength(1);
    });

    it.each(['Bricks', 'Cards', 'Parts', 'Print'])('keeps %s locked until there is an image', (step) => {
        render(<App />);
        expect(screen.getByRole('tab', { name: step })).toBeDisabled();
    });
});
