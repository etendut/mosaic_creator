import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useRef, useState } from 'react';
import { downloadFile } from '../download';
import Toast, { type ToastMessage } from './Toast';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import { canvasToPng, pngToImage } from '../mosaic/image';
import { DEFAULT_PROJECT, packProject, projectFileName, unpackProject } from '../mosaic/project';
import type { Mosaic } from '../useMosaic';
import { VERSION } from '../version';
import AboutDialog from './AboutDialog';

interface ProjectMenuProps {
    mosaic: Mosaic;
    /** Called with the image from an opened project, so the app can show it and move on to the bricks step. */
    onImageOpened: (image: HTMLImageElement) => void;
    /** Drop the image, including the copy this browser remembers. */
    onForgetImage: () => void;
}

/** Save the whole project to a file, open one, or go back to the default settings. */
const ProjectMenu = ({ mosaic, onImageOpened, onForgetImage }: ProjectMenuProps) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [about, setAbout] = useState(false);
    const [message, setMessage] = useState<ToastMessage | null>(null);

    /** A template is the settings alone: no image, and so no parts list either. */
    const save = async (template: boolean) => {
        setAnchor(null);
        try {
            const image = !template && mosaic.image ? await canvasToPng(mosaic.image) : null;
            const wantedList = image && mosaic.order.length > 0 ? toBrickLinkXml(mosaic.order) : undefined;
            const zip = packProject({ settings: mosaic.project, image }, wantedList);
            downloadFile(zip, projectFileName(mosaic.settings.title, !image), 'application/zip');
            setMessage({
                text: image ? 'Project saved.' : 'Template saved: your settings, without an image.',
            });
        } catch (e) {
            setMessage({ error: true, text: e instanceof Error ? e.message : String(e) });
        }
    };

    const open = async (file: File | undefined) => {
        if (!file) return;
        try {
            const project = unpackProject(new Uint8Array(await file.arrayBuffer()));
            const image = project.image ? await pngToImage(project.image) : null;
            mosaic.setProject(project.settings);
            if (image) onImageOpened(image);
            const kept = mosaic.image ? ' Your current image is kept.' : ' Choose an image to use it.';
            setMessage({
                text: image ? `Opened ${file.name}.` : `Opened template ${file.name}.${kept}`,
            });
        } catch (e) {
            setMessage({ error: true, text: e instanceof Error ? e.message : String(e) });
        }
    };

    const reset = () => {
        mosaic.setProject(DEFAULT_PROJECT);
        setConfirmReset(false);
        setMessage({ text: 'Settings reset to defaults.' });
    };

    return (
        <>
            <IconButton
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-haspopup="menu"
                aria-label="Menu"
                sx={{ flexShrink: 0, width: 44, height: 44 }}
            >
                <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        fileInput.current?.click();
                    }}
                >
                    <ListItemText
                        primary="Open project or template…"
                        secondary="A saved project or template (.mosaic.zip)"
                    />
                </MenuItem>
                <MenuItem onClick={() => save(false)} disabled={!mosaic.image}>
                    <ListItemText primary="Save project" secondary="Image, settings and parts list in one zip" />
                </MenuItem>
                <MenuItem onClick={() => save(true)}>
                    <ListItemText
                        primary="Save as template"
                        secondary="Just your settings, to reuse with a new image"
                    />
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
                <MenuItem
                    disabled={!mosaic.image}
                    onClick={() => {
                        setAnchor(null);
                        onForgetImage();
                        setMessage({ text: 'Image cleared. This browser no longer keeps it.' });
                    }}
                >
                    <ListItemText primary="Forget image" secondary="Clears the image this browser remembers" />
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        setAbout(true);
                    }}
                >
                    <ListItemText primary="About" secondary={`Version ${VERSION}`} />
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
            <AboutDialog open={about} onClose={() => setAbout(false)} />
            <Toast message={message} onClose={() => setMessage(null)} />
        </>
    );
};

export default ProjectMenu;
