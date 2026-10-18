import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
} from '@mui/material';
import { useRef, useState } from 'react';
import { downloadFile } from '../download';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import { canvasToPng, pngToImage } from '../mosaic/image';
import { DEFAULT_PROJECT, packProject, projectFileName, unpackProject } from '../mosaic/project';
import type { Mosaic } from '../useMosaic';

interface ProjectMenuProps {
    mosaic: Mosaic;
    /** Called with the image from an opened project, so the app can show it and move on to the bricks step. */
    onImageOpened: (image: HTMLImageElement) => void;
}

/** Save the whole project to a file, open one, or go back to the default settings. */
const ProjectMenu = ({ mosaic, onImageOpened }: ProjectMenuProps) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

    const save = async () => {
        setAnchor(null);
        try {
            const image = mosaic.image ? await canvasToPng(mosaic.image) : null;
            const wantedList = mosaic.parts.length > 0 ? toBrickLinkXml(mosaic.parts) : undefined;
            const zip = packProject({ settings: mosaic.project, image }, wantedList);
            downloadFile(zip, projectFileName(mosaic.settings.title), 'application/zip');
            setMessage({
                severity: 'success',
                text: image ? 'Project saved.' : 'Settings saved. There was no image to include.',
            });
        } catch (e) {
            setMessage({ severity: 'error', text: e instanceof Error ? e.message : String(e) });
        }
    };

    const open = async (file: File | undefined) => {
        if (!file) return;
        try {
            const project = unpackProject(new Uint8Array(await file.arrayBuffer()));
            const image = project.image ? await pngToImage(project.image) : null;
            mosaic.setProject(project.settings);
            if (image) onImageOpened(image);
            setMessage({ severity: 'success', text: `Opened ${file.name}.` });
        } catch (e) {
            setMessage({ severity: 'error', text: e instanceof Error ? e.message : String(e) });
        }
    };

    const reset = () => {
        mosaic.setProject(DEFAULT_PROJECT);
        setConfirmReset(false);
        setMessage({ severity: 'success', text: 'Settings reset to defaults.' });
    };

    return (
        <>
            <Button onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" sx={{ flexShrink: 0 }}>
                Project
            </Button>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        fileInput.current?.click();
                    }}
                >
                    <ListItemText primary="Open project…" secondary="Continue from a saved .mosaic.zip file" />
                </MenuItem>
                <MenuItem onClick={save}>
                    <ListItemText primary="Save project" secondary="Image, settings and parts list in one zip" />
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        setConfirmReset(true);
                    }}
                >
                    <ListItemText primary="Reset to defaults" secondary="Clears the settings this browser remembers" />
                </MenuItem>
            </Menu>
            <input
                ref={fileInput}
                type="file"
                accept=".zip,application/zip"
                hidden
                data-testid="project-file"
                onChange={(e) => {
                    open(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
                <DialogTitle>Reset to defaults?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Brick, plate, size, colours and card text go back to their defaults. The image stays. Save the
                        project first if you might want these settings again.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
                    <Button onClick={reset} variant="contained">
                        Reset
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={!!message}
                autoHideDuration={message?.severity === 'error' ? null : 4000}
                onClose={() => setMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {message ? (
                    <Alert severity={message.severity} onClose={() => setMessage(null)} variant="filled">
                        {message.text}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
};

export default ProjectMenu;
