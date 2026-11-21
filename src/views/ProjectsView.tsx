import { Box, Button, Stack, Typography } from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SortIcon from '@mui/icons-material/Sort';
import { useMemo, useState } from 'react';
import { sizes } from '../app/theme';
import ProjectCard from '../components/ProjectCard';
import { formatBytes } from '../library/format';
import type { MockLibrary, ProjectEntry } from '../library/mockLibrary';
import AppBarAction from '../ui/AppBarAction';
import ChoiceRow from '../ui/ChoiceRow';
import HelpText from '../ui/HelpText';
import StepLayout, { type ToolGroup } from '../ui/StepLayout';
import Toast, { type ToastMessage } from '../ui/Toast';
import { Stage, Tray } from '../ui/Tray';

type Sort = 'recent' | 'name';
type Storage = 'browser' | 'folder';

const canUseFolders = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

// PROTOTYPE: what a button not built yet says, so a dead button doesn't pass for a broken one
const NOT_YET: ToastMessage = { text: 'Not in this prototype yet.' };

const STORAGE_HELP: Record<Storage, string> = {
    browser: 'Your browser keeps these until you clear its site data. Back up all saves a copy.',
    folder: 'Saved in Mosaics on this computer. Put the folder inside Google Drive or OneDrive to sync it.',
};

interface ProjectsViewProps {
    library: MockLibrary;
    onOpen: (entry: ProjectEntry) => void;
    onNew: () => void;
    /** Open file…: pick a .mosaic.zip (the same picker as ☰ → Open file… on a phone). */
    onOpenFile: () => void;
}

/** The Mosaics view: every project, as a collection page (docs/design-system/README.md, Collection pages). */
const ProjectsView = ({ library, onOpen, onNew, onOpenFile }: ProjectsViewProps) => {
    const { projects, currentId } = library;
    const [sort, setSort] = useState<Sort>('recent');
    const [storage, setStorage] = useState<Storage>('browser');
    const [message, setMessage] = useState<ToastMessage | null>(null);

    // the open project first, then the rest in the chosen order
    const shown = useMemo(() => {
        const order = [...projects].sort((a, b) =>
            sort === 'name' ? a.name.localeCompare(b.name) : b.savedAt.getTime() - a.savedAt.getTime(),
        );
        const current = order.findIndex((p) => p.id === currentId);
        return current > 0 ? [order[current], ...order.slice(0, current), ...order.slice(current + 1)] : order;
    }, [projects, sort, currentId]);

    const remove = (entry: ProjectEntry) => {
        const undo = library.remove(entry.id);
        setMessage({ text: `Deleted ${entry.name}.`, action: { label: 'Undo', onClick: undo } });
    };

    const groups: ToolGroup[] = [
        {
            id: 'storage',
            label: 'Storage',
            icon: <FolderOutlinedIcon />,
            content: (
                <>
                    {canUseFolders() ? (
                        <ChoiceRow
                            label="Keep mosaics in"
                            value={storage}
                            onChange={(v) => setStorage(v as Storage)}
                            options={[
                                ['browser', 'This browser'],
                                ['folder', 'A folder'],
                            ]}
                            help={STORAGE_HELP[storage]}
                        />
                    ) : (
                        <HelpText>{STORAGE_HELP.browser}</HelpText>
                    )}
                    <Box>
                        <Button size="small" onClick={() => setMessage(NOT_YET)}>
                            {storage === 'folder' ? 'Choose folder…' : 'Back up all'}
                        </Button>
                    </Box>
                </>
            ),
        },
        {
            id: 'sort',
            label: 'Sort',
            icon: <SortIcon />,
            content: (
                <ChoiceRow
                    label="Order"
                    value={sort}
                    onChange={(v) => setSort(v as Sort)}
                    options={[
                        ['recent', 'Recent'],
                        ['name', 'Name'],
                    ]}
                />
            ),
        },
    ];

    const space = projects.reduce((sum, p) => sum + p.size, 0);
    const info: [string, string][] = [
        ['Mosaics', projects.length.toLocaleString()],
        ['Space', formatBytes(space)],
        ...(storage === 'browser' ? [['Backed up', 'Never'] as [string, string]] : []),
    ];

    return (
        <>
            <AppBarAction>
                <Button variant="outlined" onClick={onOpenFile} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                    Open file…
                </Button>
                <Button variant="contained" onClick={onNew}>
                    New mosaic
                </Button>
            </AppBarAction>
            <StepLayout groups={groups} info={info}>
                <Stage sx={{ display: 'flex', flexDirection: 'column' }}>
                    {shown.length > 0 ? (
                        <Box
                            component="ul"
                            aria-label="Mosaics"
                            sx={{
                                margin: 0,
                                padding: 0,
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: `repeat(auto-fill, minmax(${sizes.projectCard}px, 1fr))`,
                                },
                                alignContent: 'start',
                            }}
                        >
                            {shown.map((entry) => (
                                <ProjectCard
                                    key={entry.id}
                                    entry={entry}
                                    current={entry.id === currentId}
                                    onOpen={() => onOpen(entry)}
                                    onDuplicate={() => library.duplicate(entry.id)}
                                    onDelete={() => remove(entry)}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Stack sx={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 1 }}>
                            <Tray sx={{ padding: 4, textAlign: 'center', maxWidth: sizes.emptyCard }}>
                                <Typography variant="h2" component="p" gutterBottom>
                                    No mosaics yet
                                </Typography>
                                <Typography color="textSecondary" sx={{ paddingBottom: 2.5 }}>
                                    Start with a picture. You'll find your mosaic here, saved as you go.
                                </Typography>
                                <Button variant="contained" size="large" onClick={onNew}>
                                    New mosaic
                                </Button>
                                <Typography variant="body2" color="textSecondary" sx={{ paddingTop: 2.5 }}>
                                    Have a .mosaic.zip? Open it with Open file…
                                </Typography>
                            </Tray>
                        </Stack>
                    )}
                </Stage>
            </StepLayout>
            <Toast message={message} onClose={() => setMessage(null)} />
        </>
    );
};

export default ProjectsView;
