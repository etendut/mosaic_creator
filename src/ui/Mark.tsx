import { Box } from '@mui/material';
import mark from '../favicon.svg';

/**
 * The app's mark (src/favicon.svg) at icon size, standing for Mosaics, the library of your mosaics: its title, and
 * the editor's link back to it. Decorative: the word beside it, or the button's label, names it.
 */
const Mark = ({ size = 20 }: { size?: number | { xs: number; md: number } }) => (
    <Box
        component="img"
        src={mark}
        alt=""
        aria-hidden
        sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    />
);

export default Mark;
