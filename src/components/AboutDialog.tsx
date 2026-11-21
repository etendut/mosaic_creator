import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import { BUILD, COMMIT_URL, REPO_URL, VERSION } from '../lib/version';

/** What the app is, where it comes from, and which build this is. */
const AboutDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <Dialog open={open} onClose={onClose} aria-labelledby="about-title">
        <DialogTitle id="about-title">About Mosaic Creator</DialogTitle>
        <DialogContent>
            <Stack spacing={1.5}>
                <Typography>
                    Mosaic Creator turns your picture into a LEGO mosaic. You print numbered building cards for a group
                    build and order the parts with a BrickLink wanted list.
                </Typography>
                <Typography>
                    The app runs in your browser, so your images stay on this device. Your mosaics are kept in this
                    browser, or in a folder you choose.
                </Typography>
                <Typography>
                    You&apos;re using version {VERSION}
                    {BUILD && COMMIT_URL && (
                        <>
                            {' '}
                            (build{' '}
                            <Link href={COMMIT_URL} target="_blank" rel="noreferrer" sx={{ fontFamily: 'monospace' }}>
                                {BUILD}
                            </Link>
                            )
                        </>
                    )}
                    . Report a problem or ask for a feature on{' '}
                    <Link href={REPO_URL} target="_blank" rel="noreferrer">
                        GitHub
                    </Link>
                    , where the source code lives under the MIT licence.
                </Typography>
                <Typography variant="body2" color="textSecondary">
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
