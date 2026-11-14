import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import { COMMIT_URL, REPO_URL, VERSION } from '../version';

/** What the app is, where it comes from, and which build this is. */
const AboutDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <Dialog open={open} onClose={onClose} aria-labelledby="about-title">
        <DialogTitle id="about-title">About Mosaic Creator</DialogTitle>
        <DialogContent>
            <Stack spacing={1.5}>
                <Typography>
                    Turns a picture into a LEGO mosaic, with numbered building cards to print for a group build and a
                    BrickLink wanted list for the parts.
                </Typography>
                <Typography>
                    It runs entirely in your browser. Your images never leave this device; the settings and last image
                    are remembered in this browser only.
                </Typography>
                <Typography>
                    Version{' '}
                    {COMMIT_URL ? (
                        <Link href={COMMIT_URL} target="_blank" rel="noreferrer" sx={{ fontFamily: 'monospace' }}>
                            {VERSION}
                        </Link>
                    ) : (
                        VERSION
                    )}
                    . Source code, and somewhere to report problems or ask for features, on{' '}
                    <Link href={REPO_URL} target="_blank" rel="noreferrer">
                        GitHub
                    </Link>
                    . MIT licence.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this project.
                    Part and colour data comes from the{' '}
                    <Link href="https://www.bricklink.com" target="_blank" rel="noreferrer">
                        BrickLink
                    </Link>{' '}
                    catalog.
                </Typography>
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Close</Button>
        </DialogActions>
    </Dialog>
);

export default AboutDialog;
