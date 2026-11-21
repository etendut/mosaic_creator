import { Divider, IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useEffect, useRef, useState } from 'react';
import { downloadFile } from '../lib/download';
import Toast, { type ToastMessage } from '../ui/Toast';
import { toBrickLinkXml } from '../mosaic/bricklinkXml';
import { canvasToPng } from '../mosaic/image';
import { packProject, projectFileName } from '../mosaic/project';
import type { Mosaic } from '../hooks/useMosaic';
import { VERSION } from '../lib/version';
import AboutDialog from './AboutDialog';
import { useInstall } from '../hooks/useInstall';
import ThemeChoice from './ThemeChoice';

interface ProjectMenuProps {
    /** Which view the menu is in: each has its own project items above the app items. */
    view?: 'projects' | 'mosaic';
    mosaic: Mosaic;
    /** The open project's name, for its downloaded file. */
    name: string;
    /** Open file…: what to say once the file is in (or why it isn't). */
    onOpenFile: (file: File) => Promise<ToastMessage | null>;
    /** Start the Walkthrough; focus goes back to `opener` when it ends. */
    onShowMeAround: (opener: HTMLElement) => void;
    /** Set to open the file picker, so Mosaics' Open file… button (on desktop) uses the same one. */
    openFileRef?: React.RefObject<(() => void) | null>;
}

/**
 * ☰, per view: in the editor, this mosaic's files (a copy to keep, or its settings as a template); in Mosaics, Open
 * file… on a phone. Then the app's own items in both: the tour, installing, Theme and About.
 */
const ProjectMenu = ({ view = 'mosaic', mosaic, name, onOpenFile, onShowMeAround, openFileRef }: ProjectMenuProps) => {
    const menuButton = useRef<HTMLButtonElement>(null);
    const offerInstall = useInstall();
    const fileInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (openFileRef) openFileRef.current = () => fileInput.current?.click();
    }, [openFileRef]);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [about, setAbout] = useState(false);
    const [message, setMessage] = useState<ToastMessage | null>(null);

    /** A template is the settings alone: no image, and so no parts list either. */
    const save = async (template: boolean) => {
        setAnchor(null);
        try {
            const image = !template && mosaic.image ? await canvasToPng(mosaic.image) : null;
            const wantedList = image && mosaic.order.length > 0 ? toBrickLinkXml(mosaic.order) : undefined;
            const zip = packProject({ settings: mosaic.project, image, meta: { name } }, wantedList);
            downloadFile(zip, projectFileName(name, !image), 'application/zip');
            setMessage({
                text: image ? 'Project downloaded.' : 'Template saved: your settings, without an image.',
            });
        } catch (e) {
            setMessage({ error: true, text: e instanceof Error ? e.message : String(e) });
        }
    };

    const open = async (file: File | undefined) => {
        if (file) setMessage(await onOpenFile(file));
    };

    // the editor: this mosaic's files. Opening and starting mosaics live in Mosaics, and it saves itself
    const mosaicItems = [
        <MenuItem key="download" onClick={() => save(false)} disabled={!mosaic.image}>
            <ListItemText primary="Download project" secondary="Image, settings and parts list in one zip" />
        </MenuItem>,
        <MenuItem key="template" onClick={() => save(true)}>
            <ListItemText primary="Save as template" secondary="Just your settings, to reuse with a new image" />
        </MenuItem>,
        <Divider key="divider" />,
    ];
    // in Mosaics: on desktop, Open file… sits in the app bar beside New mosaic; on a phone it's here
    const projectItems = [
        <MenuItem
            key="open"
            sx={{ display: { md: 'none' } }}
            onClick={() => {
                setAnchor(null);
                fileInput.current?.click();
            }}
        >
            <ListItemText primary="Open file…" secondary="A project, template or backup (.zip)" />
        </MenuItem>,
        <Divider key="divider" sx={{ display: { md: 'none' } }} />,
    ];

    return (
        <>
            <IconButton
                ref={menuButton}
                data-tour="menu"
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-haspopup="menu"
                aria-label="Menu"
                sx={{ flexShrink: 0, width: 44, height: 44 }}
            >
                <MenuIcon />
            </IconButton>
            {/* `menu`, not the default `selectedMenu`: it opens on its first item, not on the chosen theme */}
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} variant="menu">
                {view === 'projects' ? projectItems : mosaicItems}
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        onShowMeAround(menuButton.current!);
                    }}
                >
                    <ListItemText primary="Show me around" secondary="A short tour from a picture to printed cards" />
                </MenuItem>
                {offerInstall && (
                    <MenuItem
                        onClick={() => {
                            setAnchor(null);
                            if (offerInstall.kind === 'prompt') offerInstall.install();
                        }}
                    >
                        <ListItemText
                            primary="Install app"
                            secondary={
                                offerInstall.kind === 'prompt'
                                    ? 'Use it offline, in its own window'
                                    : // a page can't start the install on an iPhone or iPad: say how instead
                                      'In Safari, tap Share, then Add to Home Screen'
                            }
                        />
                    </MenuItem>
                )}
                <Divider />
                {/* a setting most people change once: one quiet row, just above About */}
                <ThemeChoice />
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
            <AboutDialog open={about} onClose={() => setAbout(false)} />
            <Toast message={message} onClose={() => setMessage(null)} />
        </>
    );
};

export default ProjectMenu;
